-- Migration: Replace insecure RLS policies with user-scoped policies
-- Users can only access their own submissions

-- Drop existing open policies (if they exist)
DROP POLICY IF EXISTS anon_can_insert ON onboarding_submissions;
DROP POLICY IF EXISTS anon_can_select ON onboarding_submissions;
DROP POLICY IF EXISTS anon_can_update_drafts ON onboarding_submissions;

-- Ensure RLS is enabled
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
ON onboarding_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own submissions
CREATE POLICY "Users can view own submissions"
ON onboarding_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own drafts
CREATE POLICY "Users can update own drafts"
ON onboarding_submissions FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND submission_status = 'draft')
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
ON onboarding_submissions FOR DELETE TO authenticated
USING (auth.uid() = user_id AND submission_status = 'draft');

-- Comments for documentation
COMMENT ON POLICY "Users can insert own submissions" ON onboarding_submissions IS 'Authenticated users can create submissions with their own user_id';
COMMENT ON POLICY "Users can view own submissions" ON onboarding_submissions IS 'Users can only view submissions they own';
COMMENT ON POLICY "Users can update own drafts" ON onboarding_submissions IS 'Users can only update their own draft submissions';
COMMENT ON POLICY "Users can delete own drafts" ON onboarding_submissions IS 'Users can only delete their own draft submissions';
