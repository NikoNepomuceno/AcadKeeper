-- COMPLETE RESET OF RLS POLICIES FOR user_profiles
-- Run this script to fix the infinite recursion error

-- First, disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including any we might have missed)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON user_profiles';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy 1: All authenticated users can read all profiles
CREATE POLICY "authenticated_read_all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Users can update only their own profile
CREATE POLICY "users_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow inserts (for the signup trigger)
CREATE POLICY "allow_insert"
  ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_profiles';
