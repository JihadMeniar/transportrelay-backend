/**
 * Subscriptions Service
 * Business logic for subscription management
 */

import { subscriptionsRepository } from './subscriptions.repository';
import { stripe, STRIPE_CONFIG } from '../../config/stripe';
import { AppError } from '../../shared/middleware';
import {
  SubscriptionPlan,
  Subscription,
  SubscriptionWithUsage,
  CheckoutSession,
  SubscriptionStatus,
} from '../../shared/types';
import { usersRepository } from '../users/users.repository';
import { referralRepository } from '../auth/referral.repository';

export class SubscriptionsService {
  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return subscriptionsRepository.getPlans(true);
  }

  /**
   * Get user's subscription status with usage info
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionWithUsage> {
    // Check if user is a priority user (family members get unlimited access)
    const user = await usersRepository.findById(userId);
    const isPriorityUser = user?.is_priority === true;

    // Get or create subscription
    let subscription = await subscriptionsRepository.getSubscriptionWithPlan(userId);

    if (!subscription) {
      subscription = await subscriptionsRepository.createSubscription(userId);
    }

    // Priority users are treated as having active subscription
    if (isPriorityUser) {
      return {
        subscription: {
          ...subscription,
          status: 'active',
        },
        usage: {
          ridesPublished: 0,
          ridesAccepted: 0,
          limit: null, // Unlimited
          remaining: null, // Unlimited
        },
      };
    }

    // Get usage
    const usage = await subscriptionsRepository.getCurrentMonthUsage(userId);
    // Only count accepted rides toward the limit (publishing is unlimited)
    const acceptedRides = usage?.ridesAccepted || 0;

    // Determine limit based on subscription
    const plan = subscription.plan || (await subscriptionsRepository.getPlanById('free'));
    const baseLimit = plan?.rideLimit ?? STRIPE_CONFIG.FREE_RIDES_PER_MONTH;

    // Add referral bonuses for free users
    const referralBonus = subscription.status === 'active' ? 0 : await referralRepository.getReferralBonusForMonth(userId);
    const effectiveLimit = baseLimit + referralBonus;

    return {
      subscription,
      usage: {
        ridesPublished: usage?.ridesPublished || 0,
        ridesAccepted: acceptedRides,
        limit: subscription.status === 'active' ? null : effectiveLimit,
        remaining: subscription.status === 'active' ? null : Math.max(0, effectiveLimit - acceptedRides),
      },
    };
  }

  /**
   * Check if user can accept a ride (limit only applies to accepting, not publishing)
   */
  async canPerformRideAction(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    // Check if user is a priority user (family members get unlimited access)
    const user = await usersRepository.findById(userId);
    if (user?.is_priority) {
      return { allowed: true };
    }

    const { subscription, usage } = await this.getSubscriptionStatus(userId);

    // Active subscribers have unlimited access
    if (subscription.status === 'active') {
      return { allowed: true };
    }

    // Check free tier limit - only count accepted rides (publishing is unlimited)
    // usage.limit already includes referral bonuses from getSubscriptionStatus()
    const effectiveLimit = usage.limit || STRIPE_CONFIG.FREE_RIDES_PER_MONTH;
    const acceptedRides = usage.ridesAccepted;

    if (acceptedRides >= effectiveLimit) {
      return {
        allowed: false,
        reason: `Vous avez atteint la limite de ${effectiveLimit} courses acceptées ce mois-ci. Passez à l'abonnement pour continuer à accepter des courses.`,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: effectiveLimit - acceptedRides,
    };
  }

  /**
   * Increment ride usage when user publishes or accepts a ride
   */
  async incrementUsage(userId: string, type: 'published' | 'accepted'): Promise<void> {
    await subscriptionsRepository.incrementRideUsage(userId, type);
  }

  /**
   * Create Stripe checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    planId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<CheckoutSession> {
    if (!stripe) {
      throw new AppError(500, 'Stripe is not configured');
    }

    // Get plan
    const plan = await subscriptionsRepository.getPlanById(planId);
    if (!plan || !plan.isActive) {
      throw new AppError(404, 'Plan not found or inactive');
    }

    if (plan.priceCents === 0) {
      throw new AppError(400, 'Cannot checkout free plan');
    }

    // Get user info
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Get or create subscription record
    let subscription = await subscriptionsRepository.getSubscriptionByUserId(userId);
    if (!subscription) {
      subscription = await subscriptionsRepository.createSubscription(userId);
    }

    // Get or create Stripe customer
    let customerId = subscription.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;

      await subscriptionsRepository.updateSubscription(userId, {
        stripeCustomerId: customerId,
      });
    }

    // Create or get Stripe price
    let priceId = plan.stripePriceId;
    if (!priceId) {
      // Create product and price in Stripe
      const product = await stripe.products.create({
        name: `Transport Relay - ${plan.name}`,
        description: plan.description || undefined,
        metadata: { planId: plan.id },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.priceCents,
        currency: plan.currency.toLowerCase(),
        recurring: {
          interval: plan.interval,
          interval_count: plan.intervalCount,
        },
        metadata: { planId: plan.id },
      });

      priceId = price.id;
      await subscriptionsRepository.updatePlanStripePriceId(plan.id, priceId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || STRIPE_CONFIG.SUCCESS_URL,
      cancel_url: cancelUrl || STRIPE_CONFIG.CANCEL_URL,
      metadata: {
        userId,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          userId,
          planId: plan.id,
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Subscriptions] Unhandled webhook event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      console.error('[Subscriptions] Missing metadata in checkout session');
      return;
    }

    // Subscription will be updated via subscription.created/updated webhook
    console.log(`[Subscriptions] Checkout completed for user ${userId}, plan ${planId}`);
  }

  private async handleSubscriptionUpdated(stripeSubscription: any): Promise<void> {
    const subscription = await subscriptionsRepository.getSubscriptionByStripeSubscriptionId(
      stripeSubscription.id
    );

    if (!subscription) {
      // Try to find by customer ID
      const subByCustomer = await subscriptionsRepository.getSubscriptionByStripeCustomerId(
        stripeSubscription.customer
      );
      if (!subByCustomer) {
        console.error('[Subscriptions] Subscription not found for Stripe subscription:', stripeSubscription.id);
        return;
      }
    }

    const userId = subscription?.userId || (await this.getUserIdFromStripeCustomer(stripeSubscription.customer));
    if (!userId) return;

    // Map Stripe status to our status
    let status: SubscriptionStatus = 'free';
    switch (stripeSubscription.status) {
      case 'active':
      case 'trialing':
        status = 'active';
        break;
      case 'past_due':
        status = 'past_due';
        break;
      case 'canceled':
      case 'unpaid':
        status = 'cancelled';
        break;
      default:
        status = 'expired';
    }

    // Get plan ID from metadata or price
    const planId = stripeSubscription.metadata?.planId ||
                   stripeSubscription.items?.data?.[0]?.price?.metadata?.planId;

    await subscriptionsRepository.updateSubscription(userId, {
      planId: planId || null,
      status,
      stripeSubscriptionId: stripeSubscription.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    });

    console.log(`[Subscriptions] Updated subscription for user ${userId}: ${status}`);
  }

  private async handleSubscriptionDeleted(stripeSubscription: any): Promise<void> {
    const subscription = await subscriptionsRepository.getSubscriptionByStripeSubscriptionId(
      stripeSubscription.id
    );

    if (!subscription) return;

    await subscriptionsRepository.updateSubscription(subscription.userId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    console.log(`[Subscriptions] Subscription cancelled for user ${subscription.userId}`);
  }

  private async handleInvoicePaid(invoice: any): Promise<void> {
    const subscription = await subscriptionsRepository.getSubscriptionByStripeCustomerId(
      invoice.customer
    );

    if (!subscription) return;

    await subscriptionsRepository.addPaymentRecord({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent,
      amountCents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      status: 'succeeded',
      description: `Paiement abonnement - ${invoice.lines?.data?.[0]?.description || 'Transport Relay'}`,
    });

    console.log(`[Subscriptions] Payment recorded for user ${subscription.userId}`);
  }

  private async handlePaymentFailed(invoice: any): Promise<void> {
    const subscription = await subscriptionsRepository.getSubscriptionByStripeCustomerId(
      invoice.customer
    );

    if (!subscription) return;

    await subscriptionsRepository.addPaymentRecord({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amountCents: invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      description: 'Paiement echoue',
    });

    // Update subscription status
    await subscriptionsRepository.updateSubscription(subscription.userId, {
      status: 'past_due',
    });

    console.log(`[Subscriptions] Payment failed for user ${subscription.userId}`);
  }

  private async getUserIdFromStripeCustomer(customerId: string): Promise<string | null> {
    const subscription = await subscriptionsRepository.getSubscriptionByStripeCustomerId(customerId);
    return subscription?.userId || null;
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    if (!stripe) {
      throw new AppError(500, 'Stripe is not configured');
    }

    const subscription = await subscriptionsRepository.getSubscriptionByUserId(userId);
    if (!subscription) {
      throw new AppError(404, 'No subscription found');
    }

    if (subscription.status !== 'active') {
      throw new AppError(400, 'No active subscription to cancel');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new AppError(400, 'No Stripe subscription found');
    }

    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local record
    const updated = await subscriptionsRepository.updateSubscription(userId, {
      cancelAtPeriodEnd: true,
    });

    if (!updated) {
      throw new AppError(500, 'Failed to update subscription');
    }

    return updated;
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(userId: string): Promise<Subscription> {
    if (!stripe) {
      throw new AppError(500, 'Stripe is not configured');
    }

    const subscription = await subscriptionsRepository.getSubscriptionByUserId(userId);
    if (!subscription) {
      throw new AppError(404, 'No subscription found');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new AppError(400, 'Subscription is not scheduled for cancellation');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new AppError(400, 'No Stripe subscription found');
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local record
    const updated = await subscriptionsRepository.updateSubscription(userId, {
      cancelAtPeriodEnd: false,
    });

    if (!updated) {
      throw new AppError(500, 'Failed to update subscription');
    }

    return updated;
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string): Promise<any[]> {
    return subscriptionsRepository.getPaymentHistory(userId);
  }
}

export const subscriptionsService = new SubscriptionsService();
