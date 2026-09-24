import { NextRequest, NextResponse } from 'next/server';
import { generateInvoice } from '@/actions/finance/invoices';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chargeId } = body;

    if (!chargeId) {
      return NextResponse.json({ error: 'chargeId is required' }, { status: 400 });
    }

    const invoice = await generateInvoice({ chargeId });

    return NextResponse.json({
      id: invoice.id,
      folio: invoice.folio,
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
