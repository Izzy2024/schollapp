import type { PaymentGateway } from './types';

export type { PaymentGateway, CheckoutSessionInput, CompletedPaymentEvent } from './types';

/**
 * Returns the online payment gateway, or null if none is configured. Unlike
 * storage/email, there is no meaningful "local" fallback for accepting real
 * money — callers should surface PAYMENT_GATEWAY_NOT_CONFIGURED and fall
 * back to the existing manual/cash recording flow (finance/payments.ts).
 */
export async function getPaymentGateway(): Promise<PaymentGateway | null> {
  if (process.env.STRIPE_SECRET_KEY) {
    const { stripePaymentGateway } = await import('./stripe-adapter');
    return stripePaymentGateway;
  }
  return null;
}
