import Stripe from 'stripe';

let stripeClient = null;

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};
