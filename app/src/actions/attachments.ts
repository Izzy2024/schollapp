'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getStorageAdapter } from '@/lib/storage';
import { checkUploadPolicy, MAX_UPLOAD_SIZE_BYTES } from '@/lib/storage/upload-policy';
import { assertAttachmentAccess } from '@/lib/attachments-access';

export async function uploadAttachment(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const file = formData.get('file') as File;
  const ownerType = formData.get('ownerType') as string;
  const ownerId = formData.get('ownerId') as string;

  if (!file || !ownerType || !ownerId) {
    throw new Error('Faltan parámetros requeridos');
  }

  const violation = checkUploadPolicy(file);
  if (violation === 'type') throw new Error('Tipo de archivo no permitido');
  if (violation === 'size') {
    throw new Error(`El archivo supera el tamaño máximo permitido (${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB)`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = await getStorageAdapter();
  const stored = await storage.upload({
    tenantId: tenant.id,
    fileName: file.name,
    contentType: file.type,
    buffer,
  });

  const attachment = await prisma.attachment.create({
    data: {
      tenantId: tenant.id,
      ownerType,
      ownerId,
      fileName: file.name,
      fileKey: stored.fileKey,
      contentType: file.type,
      sizeBytes: file.size,
    }
  });

  // Clients never see the raw storage locator: downloads go through the
  // authenticated route /api/files/[id] (Content-Disposition: attachment).
  return { success: true, attachment: { ...attachment, fileUrl: `/api/files/${attachment.id}` } };
}

export async function getAttachments(ownerType: string, ownerId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const attachments = await prisma.attachment.findMany({
    where: {
      tenantId: tenant.id,
      ownerType,
      ownerId
    },
    orderBy: { createdAt: 'asc' }
  });

  const visible = [];
  for (const attachment of attachments) {
    try {
      await assertAttachmentAccess({
        tenantId: tenant.id,
        user: session.user,
        attachment,
        access: 'view',
      });
      visible.push(attachment);
    } catch {
      // Not the owner: skip silently (no enumeration of other owners' files).
    }
  }

  return visible;
}

export async function deleteAttachment(attachmentId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, tenantId: tenant.id }
  });

  if (!attachment) {
    throw new Error('Archivo no encontrado');
  }

  await assertAttachmentAccess({
    tenantId: tenant.id,
    user: session.user,
    attachment,
    access: 'delete',
  });

  // Delete from DB
  await prisma.attachment.delete({
    where: { id: attachmentId }
  });

  // Best-effort: remove the underlying file. A failure here (already deleted,
  // storage backend hiccup) shouldn't roll back the DB delete.
  try {
    const storage = await getStorageAdapter();
    await storage.remove(attachment.fileKey);
  } catch (err) {
    console.error('Error deleting stored file (it might have been deleted already):', err);
  }

  return { success: true };
}
