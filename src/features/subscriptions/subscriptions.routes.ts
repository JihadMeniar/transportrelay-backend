/**
 * Subscriptions Routes
 * API routes for subscription management
 */

import { Router } from 'express';
import { subscriptionsController } from './subscriptions.controller';
import { authenticate } from '../../shared/middleware';

const router = Router();

// Public routes
router.get('/plans', subscriptionsController.getPlans);

// Webhook (must be before authenticate middleware, needs raw body)
// Note: This route should be mounted separately with raw body parser

// Protected routes
router.use(authenticate);

router.get('/status', subscriptionsController.getStatus);
router.get('/can-ride', subscriptionsController.canPerformRide);
router.get('/history', subscriptionsController.getPaymentHistory);
router.post('/checkout', subscriptionsController.createCheckout);
router.post('/cancel', subscriptionsController.cancelSubscription);
router.post('/reactivate', subscriptionsController.reactivateSubscription);

export default router;
