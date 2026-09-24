import { NextRequest, NextResponse } from 'next/server';
import { generateEnrollmentCertificatePdf } from '@/actions/certificates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string; academicYearId: string }> }
) {
  try {
    const { studentId, academicYearId } = await params;
    const pdfBuffer = await generateEnrollmentCertificatePdf(studentId, academicYearId);
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="constancia-${studentId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('Error generating enrollment certificate PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
