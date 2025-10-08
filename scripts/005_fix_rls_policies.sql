-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;

-- Create more permissive policies
-- Policy: Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can read all profiles (separate policy)
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    role = 'admin'
  );

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Allow inserts from the trigger function
CREATE POLICY "Allow profile creation"
  ON user_profiles
  FOR INSERT
  WITH CHECK (true);
