
-- Add timezone field to schools table
ALTER TABLE schools 
ADD COLUMN timezone text DEFAULT 'UTC';

-- Add timezone field to users table  
ALTER TABLE users
ADD COLUMN timezone text;

-- Add some indexes for performance
CREATE INDEX IF NOT EXISTS idx_schools_timezone ON schools(timezone);
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);
