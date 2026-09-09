import Stripe from 'stripe';
import type { PaymentGateway } from './types';

function getClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Activates when STRIPE_SECRET_KEY is set (see index.ts). STRIPE_WEBHOOK_SECRET
// is required to verify webhook signatures in parseWebhookEvent.
export const stripePaymentGateway: PaymentGateway = {
  async createCheckoutSession({ amountCents, currency, description, successUrl, cancelUrl, metadata }) {
    const stripe = getClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: description },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url };
  },

  async parseWebhookEvent(rawBody, signature) {
    const stripe = getClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    if (event.type !== 'checkout.session.completed') return null;

    const session = event.data.object as Stripe.Checkout.Session;
    return {
      metadata: (session.metadata as Record<string, string>) ?? {},
      amountCents: session.amount_total ?? 0,
      currency: (session.currency ?? 'usd').toUpperCase(),
      externalReference: session.id,
    };
  },
};
