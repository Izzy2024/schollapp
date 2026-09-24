import { NextRequest, NextResponse } from 'next/server';
import { generateReportCardPdf } from '@/actions/reportCards';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; termId: string }> }
) {
  try {
    const { studentId, termId } = await params;
    const pdfBuffer = await generateReportCardPdf(studentId, termId);
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="boleta-${studentId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('Error generating report card PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
