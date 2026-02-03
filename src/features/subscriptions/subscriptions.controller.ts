/**
 * Subscriptions Controller
 * HTTP handlers for subscription endpoints
 */

import { Request, Response } from 'express';
import { subscriptionsService } from './subscriptions.service';
import { AuthRequest, asyncHandler } from '../../shared/middleware';
import { stripe, STRIPE_CONFIG } from '../../config/stripe';

export class SubscriptionsController {
  /**
   * GET /api/subscriptions/plans
   * Get all available subscription plans
   */
  getPlans = asyncHandler(async (_req: Request, res: Response) => {
    const plans = await subscriptionsService.getPlans();

    res.status(200).json({
      success: true,
      data: { plans },
    });
  });

  /**
   * GET /api/subscriptions/status
   * Get current user's subscription status
   */
  getStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const status = await subscriptionsService.getSubscriptionStatus(userId);

    res.status(200).json({
      success: true,
      data: status,
    });
  });

  /**
   * POST /api/subscriptions/checkout
   * Create Stripe checkout session
   */
  createCheckout = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { planId, successUrl, cancelUrl } = req.body;

    if (!planId) {
      res.status(400).json({
        success: false,
        message: 'planId is required',
      });
      return;
    }

    const session = await subscriptionsService.createCheckoutSession(
      userId,
      planId,
      successUrl,
      cancelUrl
    );

    res.status(200).json({
      success: true,
      data: session,
    });
  });

  /**
   * POST /api/subscriptions/cancel
   * Cancel subscription at period end
   */
  cancelSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const subscription = await subscriptionsService.cancelSubscription(userId);

    res.status(200).json({
      success: true,
      data: { subscription },
      message: 'Abonnement annule. Il restera actif jusqu\'a la fin de la periode.',
    });
  });

  /**
   * POST /api/subscriptions/reactivate
   * Reactivate cancelled subscription
   */
  reactivateSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const subscription = await subscriptionsService.reactivateSubscription(userId);

    res.status(200).json({
      success: true,
      data: { subscription },
      message: 'Abonnement reactive avec succes.',
    });
  });

  /**
   * GET /api/subscriptions/history
   * Get payment history
   */
  getPaymentHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const payments = await subscriptionsService.getPaymentHistory(userId);

    res.status(200).json({
      success: true,
      data: { payments },
    });
  });

  /**
   * POST /api/subscriptions/webhook
   * Handle Stripe webhooks
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!stripe) {
      res.status(500).json({ error: 'Stripe not configured' });
      return;
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event;

    try {
      // req.body should be raw buffer for webhook verification
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        STRIPE_CONFIG.WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('[Webhook] Signature verification failed:', err.message);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }

    // Handle the event
    try {
      await subscriptionsService.handleWebhook(event);
    } catch (err) {
      console.error('[Webhook] Error handling event:', err);
      // Don't return error to Stripe, just log it
    }

    res.status(200).json({ received: true });
  });

  /**
   * GET /api/subscriptions/can-ride
   * Check if user can perform ride actions
   */
  canPerformRide = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const result = await subscriptionsService.canPerformRideAction(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}

export const subscriptionsController = new SubscriptionsController();
