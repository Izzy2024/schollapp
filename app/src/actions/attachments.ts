'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

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

  // Determine local upload directory
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenant.id);
  
  // Ensure directory exists
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name);
  const uniqueFilename = `${randomUUID()}${ext}`;
  const filePath = path.join(uploadDir, uniqueFilename);
  const fileUrl = `/uploads/${tenant.id}/${uniqueFilename}`; // Public URL to access the file

  // Write file to disk
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filePath, buffer);

  // Save to DB
  const attachment = await prisma.attachment.create({
    data: {
      tenantId: tenant.id,
      ownerType,
      ownerId,
      fileName: file.name,
      fileKey: fileUrl, // using fileKey as the public URL for local storage
      contentType: file.type,
      sizeBytes: file.size,
    }
  });

  return { success: true, attachment };
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

  return attachments;
}

export async function deleteAttachment(attachmentId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId, tenantId: tenant.id }
  });

  if (!attachment) {
    throw new Error('Archivo no encontrado');
  }

  // Delete from DB
  await prisma.attachment.delete({
    where: { id: attachmentId }
  });

  // Try to delete physical file
  try {
    // fileKey is like '/uploads/tenantId/uuid.ext'
    // Map it back to the absolute local path
    const relativePath = attachment.fileKey.startsWith('/') ? attachment.fileKey.slice(1) : attachment.fileKey;
    const physicalPath = path.join(process.cwd(), 'public', relativePath);
    await fs.unlink(physicalPath);
  } catch (err) {
    console.error('Error deleting physical file (it might have been deleted already):', err);
    // Non-fatal error, DB record is already deleted
  }

  return { success: true };
}
