/**
 * Stripe Configuration
 * Configuration pour l'integration Stripe
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set - Stripe functionality will be disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const STRIPE_CONFIG = {
  // Webhook secret for verifying Stripe events
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // URLs for checkout success/cancel
  SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || 'taxirelay://subscription/success',
  CANCEL_URL: process.env.STRIPE_CANCEL_URL || 'taxirelay://subscription/cancel',

  // Free tier limits
  FREE_RIDES_PER_MONTH: 5,
};

export default stripe;
