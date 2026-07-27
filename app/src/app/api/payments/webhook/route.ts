import { NextRequest, NextResponse } from 'next/server';
import { getPaymentGateway } from '@/lib/payment';
import { recordOnlinePaymentFromWebhook } from '@/actions/finance/onlinePayments';

export async function POST(request: NextRequest) {
  const gateway = await getPaymentGateway();
  if (!gateway) {
    return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature') ?? '';
  const rawBody = await request.text();

  try {
    const event = await gateway.parseWebhookEvent(rawBody, signature);
    if (!event) {
      return NextResponse.json({ received: true });
    }

    const result = await recordOnlinePaymentFromWebhook(event);
    if ('error' in result) {
      console.error('Error recording online payment from webhook:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing payment webhook:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 400 });
  }
}
