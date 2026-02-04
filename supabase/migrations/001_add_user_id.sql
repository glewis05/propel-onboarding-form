-- Migration: Add user_id column to onboarding_submissions
-- This links submissions to authenticated users for secure access

-- Add user_id column referencing auth.users
ALTER TABLE onboarding_submissions
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for efficient queries by user
CREATE INDEX idx_submissions_user_id ON onboarding_submissions(user_id);

-- Comment for documentation
COMMENT ON COLUMN onboarding_submissions.user_id IS 'References the authenticated user who owns this submission';
