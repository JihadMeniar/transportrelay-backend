-- Migration: Create subscription system tables
-- Handles subscription plans, user subscriptions, and ride usage tracking

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('month', 'year')),
    interval_count INTEGER DEFAULT 1,
    ride_limit INTEGER, -- NULL = unlimited
    stripe_price_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES subscription_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'cancelled', 'past_due', 'expired')),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Monthly ride usage tracking for free users
CREATE TABLE IF NOT EXISTS ride_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    rides_published INTEGER DEFAULT 0,
    rides_accepted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

-- Payment history
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_payment_intent_id VARCHAR(100),
    stripe_invoice_id VARCHAR(100),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_ride_usage_user_month ON ride_usage(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price_cents, currency, interval, interval_count, ride_limit, features) VALUES
('free', 'Gratuit', 'Acces limite pour decouvrir TaxiRelay', 0, 'EUR', 'month', 1, 5, '["5 courses par mois", "Chat avec les chauffeurs", "Notifications basiques"]'),
('monthly', 'Mensuel', 'Abonnement mensuel sans engagement', 499, 'EUR', 'month', 1, NULL, '["Courses illimitees", "Chat avec les chauffeurs", "Notifications prioritaires", "Support prioritaire"]'),
('yearly', 'Annuel', '2 mois offerts', 4990, 'EUR', 'year', 1, NULL, '["Courses illimitees", "Chat avec les chauffeurs", "Notifications prioritaires", "Support prioritaire", "2 mois offerts"]')
ON CONFLICT (id) DO NOTHING;

-- Create subscription record for existing users (free tier)
INSERT INTO subscriptions (user_id, status)
SELECT id, 'free' FROM users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Comments
COMMENT ON TABLE subscription_plans IS 'Available subscription plans';
COMMENT ON TABLE subscriptions IS 'User subscription status and Stripe integration';
COMMENT ON TABLE ride_usage IS 'Monthly ride usage tracking for free tier limits';
COMMENT ON TABLE payment_history IS 'Payment transaction history';
