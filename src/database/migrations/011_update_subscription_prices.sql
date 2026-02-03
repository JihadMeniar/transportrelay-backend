-- Migration: Update subscription plan prices
-- Monthly: 4.99€, Yearly: 49.90€ (2 mois offerts)

UPDATE subscription_plans
SET
    price_cents = 499,
    description = 'Abonnement mensuel sans engagement',
    features = '["Courses illimitees", "Chat avec les chauffeurs", "Notifications prioritaires", "Support prioritaire"]',
    updated_at = NOW()
WHERE id = 'monthly';

UPDATE subscription_plans
SET
    price_cents = 4990,
    description = '2 mois offerts',
    features = '["Courses illimitees", "Chat avec les chauffeurs", "Notifications prioritaires", "Support prioritaire", "2 mois offerts"]',
    updated_at = NOW()
WHERE id = 'yearly';
