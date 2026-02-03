-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_sender_role CHECK (sender_role IN ('publisher', 'taker')),
  CONSTRAINT check_message_type CHECK (message_type IN ('text', 'attachment')),
  CONSTRAINT check_content_length CHECK (char_length(content) <= 500)
);

-- Create composite index for efficient message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_ride_id_created_at ON chat_messages(ride_id, created_at DESC);

-- Create index on sender_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);

-- Add comments
COMMENT ON TABLE chat_messages IS 'Chat messages between ride publisher and taker';
COMMENT ON COLUMN chat_messages.ride_id IS 'Foreign key to rides table';
COMMENT ON COLUMN chat_messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN chat_messages.sender_role IS 'Role of sender: publisher or taker';
COMMENT ON COLUMN chat_messages.message_type IS 'Type of message: text or attachment';
COMMENT ON COLUMN chat_messages.content IS 'Message content or filename (max 500 chars)';
