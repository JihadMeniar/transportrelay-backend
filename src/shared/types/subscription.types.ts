/**
 * Subscription Types
 * Types pour le systeme d'abonnement
 */

export type SubscriptionStatus = 'free' | 'active' | 'cancelled' | 'past_due' | 'expired';
export type PlanInterval = 'month' | 'year';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: PlanInterval;
  intervalCount: number;
  rideLimit: number | null; // null = unlimited
  stripePriceId: string | null;
  isActive: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string | null;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  plan?: SubscriptionPlan;
}

export interface RideUsage {
  id: string;
  userId: string;
  monthYear: string; // Format: YYYY-MM
  ridesPublished: number;
  ridesAccepted: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  subscriptionId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  createdAt: Date;
}

export interface SubscriptionWithUsage {
  subscription: Subscription;
  usage: {
    ridesPublished: number;
    ridesAccepted: number;
    limit: number | null;
    remaining: number | null;
  };
}

export interface CreateCheckoutDTO {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

// Database row interfaces
export interface SubscriptionPlanRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  interval_count: number;
  ride_limit: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
  features: string[];
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface RideUsageRow {
  id: string;
  user_id: string;
  month_year: string;
  rides_published: number;
  rides_accepted: number;
  created_at: Date;
  updated_at: Date;
}
