-- Additional composite indexes for optimized queries

-- Rides: Filter by status and department (most common query)
CREATE INDEX IF NOT EXISTS idx_rides_status_department ON rides(status, department) WHERE status = 'available';

-- Rides: User's rides with status filter
CREATE INDEX IF NOT EXISTS idx_rides_user_status_published ON rides(published_by, status);
CREATE INDEX IF NOT EXISTS idx_rides_user_status_accepted ON rides(accepted_by, status) WHERE accepted_by IS NOT NULL;

-- Rides: Recent rides by department
CREATE INDEX IF NOT EXISTS idx_rides_department_published_at ON rides(department, published_at DESC);

-- Rides: Course type filtering
CREATE INDEX IF NOT EXISTS idx_rides_course_type_status ON rides(course_type, status);

-- Chat messages: Pagination support
CREATE INDEX IF NOT EXISTS idx_chat_messages_ride_pagination ON chat_messages(ride_id, created_at ASC);

-- Users: Active users only
CREATE INDEX IF NOT EXISTS idx_users_active_email ON users(email) WHERE is_active = true;

-- Ride documents: Count documents per ride efficiently
CREATE INDEX IF NOT EXISTS idx_ride_documents_ride_count ON ride_documents(ride_id, id);

-- Full-text search preparation (optional, for future use)
-- CREATE INDEX IF NOT EXISTS idx_rides_destination_search ON rides USING GIN(to_tsvector('french', destination));
-- CREATE INDEX IF NOT EXISTS idx_rides_pickup_search ON rides USING GIN(to_tsvector('french', pickup));

-- Add some useful database functions

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for rides table
DROP TRIGGER IF EXISTS update_rides_updated_at ON rides;
CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment user stats when publishing a ride
CREATE OR REPLACE FUNCTION increment_published_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET stats_published = stats_published + 1
  WHERE id = NEW.published_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment published stats
DROP TRIGGER IF EXISTS increment_published_on_ride_create ON rides;
CREATE TRIGGER increment_published_on_ride_create
  AFTER INSERT ON rides
  FOR EACH ROW
  EXECUTE FUNCTION increment_published_stats();

-- Function to increment user stats when accepting a ride
CREATE OR REPLACE FUNCTION increment_accepted_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.accepted_by IS NOT NULL AND (OLD.accepted_by IS NULL OR OLD.accepted_by != NEW.accepted_by) THEN
    UPDATE users
    SET stats_accepted = stats_accepted + 1
    WHERE id = NEW.accepted_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment accepted stats
DROP TRIGGER IF EXISTS increment_accepted_on_ride_accept ON rides;
CREATE TRIGGER increment_accepted_on_ride_accept
  AFTER UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION increment_accepted_stats();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taxirelay_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO taxirelay_user;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All migrations completed successfully!';
  RAISE NOTICE '📊 Tables created: users, rides, ride_documents, chat_messages, message_attachments';
  RAISE NOTICE '🔍 Indexes created for optimal query performance';
  RAISE NOTICE '⚡ Triggers created for auto-updating stats and timestamps';
END $$;
