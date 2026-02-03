/**
 * Subscriptions Repository
 * Database operations for subscriptions
 */

import { pool } from '../../config/database';
import {
  SubscriptionPlan,
  Subscription,
  RideUsage,
  SubscriptionPlanRow,
  SubscriptionRow,
  RideUsageRow,
  SubscriptionStatus,
} from '../../shared/types';

// Converters
const planRowToPlan = (row: SubscriptionPlanRow): SubscriptionPlan => ({
  id: row.id,
  name: row.name,
  description: row.description,
  priceCents: row.price_cents,
  currency: row.currency,
  interval: row.interval as 'month' | 'year',
  intervalCount: row.interval_count,
  rideLimit: row.ride_limit,
  stripePriceId: row.stripe_price_id,
  isActive: row.is_active,
  features: row.features || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const subscriptionRowToSubscription = (row: SubscriptionRow): Subscription => ({
  id: row.id,
  userId: row.user_id,
  planId: row.plan_id,
  status: row.status as SubscriptionStatus,
  stripeCustomerId: row.stripe_customer_id,
  stripeSubscriptionId: row.stripe_subscription_id,
  currentPeriodStart: row.current_period_start,
  currentPeriodEnd: row.current_period_end,
  cancelAtPeriodEnd: row.cancel_at_period_end,
  cancelledAt: row.cancelled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const usageRowToUsage = (row: RideUsageRow): RideUsage => ({
  id: row.id,
  userId: row.user_id,
  monthYear: row.month_year,
  ridesPublished: row.rides_published,
  ridesAccepted: row.rides_accepted,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SubscriptionsRepository {
  // ============ Plans ============

  async getPlans(activeOnly = true): Promise<SubscriptionPlan[]> {
    let query = 'SELECT * FROM subscription_plans';
    if (activeOnly) {
      query += ' WHERE is_active = true';
    }
    query += ' ORDER BY price_cents ASC';

    const result = await pool.query(query);
    return result.rows.map(planRowToPlan);
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const result = await pool.query(
      'SELECT * FROM subscription_plans WHERE id = $1',
      [planId]
    );
    return result.rows.length > 0 ? planRowToPlan(result.rows[0]) : null;
  }

  async updatePlanStripePriceId(planId: string, stripePriceId: string): Promise<void> {
    await pool.query(
      'UPDATE subscription_plans SET stripe_price_id = $1, updated_at = NOW() WHERE id = $2',
      [stripePriceId, planId]
    );
  }

  // ============ Subscriptions ============

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? subscriptionRowToSubscription(result.rows[0]) : null;
  }

  async getSubscriptionWithPlan(userId: string): Promise<(Subscription & { plan?: SubscriptionPlan }) | null> {
    const result = await pool.query(
      `SELECT s.*, p.id as plan_id, p.name as plan_name, p.description as plan_description,
              p.price_cents, p.currency, p.interval, p.interval_count, p.ride_limit,
              p.stripe_price_id, p.is_active, p.features
       FROM subscriptions s
       LEFT JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const subscription = subscriptionRowToSubscription(row);

    if (row.plan_id) {
      subscription.plan = {
        id: row.plan_id,
        name: row.plan_name,
        description: row.plan_description,
        priceCents: row.price_cents,
        currency: row.currency,
        interval: row.interval,
        intervalCount: row.interval_count,
        rideLimit: row.ride_limit,
        stripePriceId: row.stripe_price_id,
        isActive: row.is_active,
        features: row.features || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    return subscription;
  }

  async createSubscription(userId: string): Promise<Subscription> {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, status)
       VALUES ($1, 'free')
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Already exists, fetch it
      const existing = await this.getSubscriptionByUserId(userId);
      if (existing) return existing;
      throw new Error('Failed to create subscription');
    }

    return subscriptionRowToSubscription(result.rows[0]);
  }

  async updateSubscription(
    userId: string,
    data: Partial<{
      planId: string | null;
      status: SubscriptionStatus;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      cancelledAt: Date | null;
    }>
  ): Promise<Subscription | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.planId !== undefined) {
      fields.push(`plan_id = $${paramIndex++}`);
      values.push(data.planId);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.stripeCustomerId !== undefined) {
      fields.push(`stripe_customer_id = $${paramIndex++}`);
      values.push(data.stripeCustomerId);
    }
    if (data.stripeSubscriptionId !== undefined) {
      fields.push(`stripe_subscription_id = $${paramIndex++}`);
      values.push(data.stripeSubscriptionId);
    }
    if (data.currentPeriodStart !== undefined) {
      fields.push(`current_period_start = $${paramIndex++}`);
      values.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== undefined) {
      fields.push(`current_period_end = $${paramIndex++}`);
      values.push(data.currentPeriodEnd);
    }
    if (data.cancelAtPeriodEnd !== undefined) {
      fields.push(`cancel_at_period_end = $${paramIndex++}`);
      values.push(data.cancelAtPeriodEnd);
    }
    if (data.cancelledAt !== undefined) {
      fields.push(`cancelled_at = $${paramIndex++}`);
      values.push(data.cancelledAt);
    }

    if (fields.length === 0) return this.getSubscriptionByUserId(userId);

    fields.push('updated_at = NOW()');
    values.push(userId);

    const result = await pool.query(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? subscriptionRowToSubscription(result.rows[0]) : null;
  }

  async getSubscriptionByStripeCustomerId(customerId: string): Promise<Subscription | null> {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE stripe_customer_id = $1',
      [customerId]
    );
    return result.rows.length > 0 ? subscriptionRowToSubscription(result.rows[0]) : null;
  }

  async getSubscriptionByStripeSubscriptionId(subscriptionId: string): Promise<Subscription | null> {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscriptionId]
    );
    return result.rows.length > 0 ? subscriptionRowToSubscription(result.rows[0]) : null;
  }

  // ============ Ride Usage ============

  async getCurrentMonthUsage(userId: string): Promise<RideUsage | null> {
    const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
    const result = await pool.query(
      'SELECT * FROM ride_usage WHERE user_id = $1 AND month_year = $2',
      [userId, monthYear]
    );
    return result.rows.length > 0 ? usageRowToUsage(result.rows[0]) : null;
  }

  async incrementRideUsage(userId: string, type: 'published' | 'accepted'): Promise<RideUsage> {
    const monthYear = new Date().toISOString().slice(0, 7);
    const column = type === 'published' ? 'rides_published' : 'rides_accepted';

    const result = await pool.query(
      `INSERT INTO ride_usage (user_id, month_year, ${column})
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, month_year)
       DO UPDATE SET ${column} = ride_usage.${column} + 1, updated_at = NOW()
       RETURNING *`,
      [userId, monthYear]
    );

    return usageRowToUsage(result.rows[0]);
  }

  async getTotalRidesThisMonth(userId: string): Promise<number> {
    const usage = await this.getCurrentMonthUsage(userId);
    if (!usage) return 0;
    return usage.ridesPublished + usage.ridesAccepted;
  }

  // ============ Payment History ============

  async addPaymentRecord(data: {
    userId: string;
    subscriptionId?: string;
    stripePaymentIntentId?: string;
    stripeInvoiceId?: string;
    amountCents: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed' | 'refunded';
    description?: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO payment_history
       (user_id, subscription_id, stripe_payment_intent_id, stripe_invoice_id, amount_cents, currency, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.userId,
        data.subscriptionId || null,
        data.stripePaymentIntentId || null,
        data.stripeInvoiceId || null,
        data.amountCents,
        data.currency,
        data.status,
        data.description || null,
      ]
    );
  }

  async getPaymentHistory(userId: string, limit = 20): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM payment_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

export const subscriptionsRepository = new SubscriptionsRepository();
