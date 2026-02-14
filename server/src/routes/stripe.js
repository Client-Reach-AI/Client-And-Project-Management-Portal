import express, { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invoices } from '../db/schema.js';
import { getStripeClient, isStripeConfigured } from '../lib/stripe.js';

const router = Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res
        .status(503)
        .json({ message: 'Stripe webhook is not configured' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res
        .status(400)
        .json({ message: 'Missing stripe-signature header' });
    }

    let event;

    try {
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      return res
        .status(400)
        .json({ message: `Webhook Error: ${error.message}` });
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const invoiceId =
          session?.metadata?.invoiceId || session?.client_reference_id;

        if (invoiceId) {
          const [invoice] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.id, invoiceId))
            .limit(1);

          if (invoice) {
            const expectedCurrency = String(
              invoice.currency || 'USD'
            ).toLowerCase();
            const remainingAmountCents = Math.max(
              0,
              invoice.amountCents - (invoice.amountPaidCents || 0)
            );
            const sessionAmount = Number(session.amount_total || 0);
            const sessionCurrency = String(
              session.currency || ''
            ).toLowerCase();
            const isPaid = session.payment_status === 'paid';
            const matchesCurrency = sessionCurrency === expectedCurrency;
            const matchesAmount = sessionAmount === remainingAmountCents;
            const matchesSessionId =
              !invoice.stripeCheckoutSessionId ||
              invoice.stripeCheckoutSessionId === session.id;

            if (
              invoice.status !== 'PAID' &&
              invoice.status !== 'VOID' &&
              remainingAmountCents > 0 &&
              isPaid &&
              matchesCurrency &&
              matchesAmount &&
              matchesSessionId
            ) {
              await db
                .update(invoices)
                .set({
                  status: 'PAID',
                  amountPaidCents: invoice.amountCents,
                  paidAt: new Date(),
                  stripeCheckoutSessionId:
                    session.id || invoice.stripeCheckoutSessionId,
                  stripePaymentIntentId:
                    session.payment_intent || invoice.stripePaymentIntentId,
                  updatedAt: new Date(),
                })
                .where(eq(invoices.id, invoice.id));
            }
          }
        }
      }

      return res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook handler failed', error);
      return res.status(500).json({ message: 'Webhook processing failed' });
    }
  }
);

export default router;
