-- This script runs on PostgreSQL initialization
-- It ensures the user is created with md5 password encryption

-- Set password encryption to md5 for compatibility
ALTER SYSTEM SET password_encryption = 'md5';
SELECT pg_reload_conf();

-- Recreate user with md5 password
DROP USER IF EXISTS taxirelay_user;
CREATE USER taxirelay_user WITH PASSWORD 'taxirelay_password';
ALTER USER taxirelay_user CREATEDB CREATEROLE SUPERUSER;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE taxirelay TO taxirelay_user;
GRANT ALL ON SCHEMA public TO taxirelay_user;
