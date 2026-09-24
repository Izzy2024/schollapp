export type CheckoutSessionInput = {
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type CompletedPaymentEvent = {
  metadata: Record<string, string>;
  amountCents: number;
  currency: string;
  externalReference: string;
};

export interface PaymentGateway {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;
  /** Verifies a webhook request and extracts the completed payment, or null if the event isn't a completed payment. */
  parseWebhookEvent(rawBody: string, signature: string): Promise<CompletedPaymentEvent | null>;
}
