import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { requireTenant } from '@/lib/authz';
import { canAccessAttachment } from '@/lib/attachments-access';
import { getStorageAdapter } from '@/lib/storage';

/** Authenticated file download (SEG-H7): never serves uploads as statics,
 *  always forces download so a hostile .html/.svg can't execute inline. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    // Tenant always from the session, never from the URL.
    const { tenantId, userId, roles } = await requireTenant();
    const { attachmentId } = await params;

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, tenantId },
    });
    if (!attachment) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const allowed = await canAccessAttachment({
      tenantId,
      user: { id: userId, email: session.user.email ?? null, roles },
      attachment,
      access: 'view',
    });
    if (!allowed) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const storage = await getStorageAdapter();
    let buffer: Buffer;
    try {
      buffer = await storage.read(attachment.fileKey);
    } catch {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const safeName = (attachment.fileName || 'archivo').replace(/["\r\n]/g, '');
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': attachment.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
}
