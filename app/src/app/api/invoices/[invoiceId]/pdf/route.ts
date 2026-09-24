import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePdf } from '@/actions/finance/pdf-invoice';
import { STABLE_ERROR } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    const pdfBuffer = await generateInvoicePdf(invoiceId);
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${invoiceId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    const code = error?.message;
    if (code === STABLE_ERROR.UNAUTHORIZED_ROLE || code === STABLE_ERROR.TENANT_NOT_FOUND) {
      return NextResponse.json({ error: code }, { status: 403 });
    }
    if (code === 'Invoice not found') {
      return NextResponse.json({ error: code }, { status: 404 });
    }
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: code || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
