-- Create rides table
CREATE TABLE IF NOT EXISTS rides (
  id SERIAL PRIMARY KEY,
  zone VARCHAR(255) NOT NULL,
  department VARCHAR(10) NOT NULL,
  distance VARCHAR(50) NOT NULL,
  exact_distance VARCHAR(50),
  published_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  course_type VARCHAR(50) NOT NULL DEFAULT 'normal',
  medical_type VARCHAR(50),

  -- Client information (sensitive, hidden until acceptance)
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  pickup VARCHAR(500) NOT NULL,
  destination VARCHAR(500) NOT NULL,

  -- Document visibility control
  documents_visibility VARCHAR(20) DEFAULT 'hidden',

  -- Relationships to users
  published_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_status CHECK (status IN ('available', 'accepted', 'published', 'completed', 'cancelled')),
  CONSTRAINT check_course_type CHECK (course_type IN ('normal', 'medical')),
  CONSTRAINT check_medical_type CHECK (medical_type IN ('hospitalisation', 'consultation') OR medical_type IS NULL),
  CONSTRAINT check_documents_visibility CHECK (documents_visibility IN ('hidden', 'visible'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_department ON rides(department);
CREATE INDEX IF NOT EXISTS idx_rides_published_by ON rides(published_by);
CREATE INDEX IF NOT EXISTS idx_rides_accepted_by ON rides(accepted_by);
CREATE INDEX IF NOT EXISTS idx_rides_published_at ON rides(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_course_type ON rides(course_type);

-- Add comments
COMMENT ON TABLE rides IS 'Rides/courses published by users';
COMMENT ON COLUMN rides.status IS 'Ride status: available, accepted, published, completed, cancelled';
COMMENT ON COLUMN rides.course_type IS 'Type of course: normal or medical';
COMMENT ON COLUMN rides.medical_type IS 'Medical type: hospitalisation or consultation (if course_type is medical)';
COMMENT ON COLUMN rides.documents_visibility IS 'Document visibility: hidden or visible';
COMMENT ON COLUMN rides.published_by IS 'User who published the ride';
COMMENT ON COLUMN rides.accepted_by IS 'User who accepted the ride';
