-- Migration 007: Create push_tokens table
-- Stores Expo push tokens for sending notifications

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Un utilisateur peut avoir plusieurs tokens (plusieurs appareils)
    -- mais un token ne peut appartenir qu'à un seul utilisateur
    UNIQUE(push_token)
);

-- Index pour recherche par user_id
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Index pour les tokens actifs
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(user_id, is_active) WHERE is_active = true;

COMMENT ON TABLE push_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON COLUMN push_tokens.push_token IS 'Expo push token (ExponentPushToken[xxx])';
COMMENT ON COLUMN push_tokens.platform IS 'Device platform: ios, android, or web';
