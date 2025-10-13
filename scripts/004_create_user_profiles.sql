-- Create user_profiles table to store user roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superAdmin', 'admin', 'staff')) DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles FOR
SELECT USING (auth.uid() = user_id);
-- Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON user_profiles FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );
-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update profiles" ON user_profiles FOR
UPDATE USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );
-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.user_profiles (user_id, email, role)
VALUES (
    NEW.id,
    NEW.email,
    -- First user becomes superAdmin, rest are staff
    CASE
      WHEN (
        SELECT COUNT(*)
        FROM public.user_profiles
      ) = 0 THEN 'superAdmin'
      ELSE 'staff'
    END
  );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);