-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  uri VARCHAR(500) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: max 10MB per attachment
  CONSTRAINT check_attachment_size CHECK (size_bytes <= 10485760)
);

-- Create index on message_id
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- Create index on mime_type
CREATE INDEX IF NOT EXISTS idx_message_attachments_mime_type ON message_attachments(mime_type);

-- Add comments
COMMENT ON TABLE message_attachments IS 'File attachments for chat messages (max 10MB per file)';
COMMENT ON COLUMN message_attachments.message_id IS 'Foreign key to chat_messages table';
COMMENT ON COLUMN message_attachments.file_name IS 'Original filename';
COMMENT ON COLUMN message_attachments.uri IS 'Public URI for accessing the file';
COMMENT ON COLUMN message_attachments.file_path IS 'Server filesystem path';
COMMENT ON COLUMN message_attachments.mime_type IS 'File MIME type';
COMMENT ON COLUMN message_attachments.size_bytes IS 'File size in bytes (max 10MB)';
