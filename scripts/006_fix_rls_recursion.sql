-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
-- Simple policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles FOR
SELECT USING (auth.uid() = user_id);
-- Policy: Admins can read all profiles (using a non-recursive check)
CREATE POLICY "Admins can read all profiles" ON user_profiles FOR
SELECT USING (
    (
      SELECT role
      FROM user_profiles
      WHERE user_id = auth.uid()
    ) IN ('superAdmin', 'admin')
  );
-- Policy: Admins can update profiles (using a non-recursive check)
CREATE POLICY "Admins can update profiles" ON user_profiles FOR
UPDATE USING (
    (
      SELECT role
      FROM user_profiles
      WHERE user_id = auth.uid()
    ) IN ('superAdmin', 'admin')
  );
-- Policy: Allow inserts (for the trigger function)
CREATE POLICY "Allow profile creation" ON user_profiles FOR
INSERT WITH CHECK (true);