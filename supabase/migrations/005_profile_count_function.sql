-- Fix: allow counting profiles for first-user-is-DM logic
-- The RLS policy only allows users to see their own profile,
-- so a count query always returns 0 for new users.
-- This function runs with SECURITY DEFINER (bypasses RLS).

CREATE OR REPLACE FUNCTION get_profile_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM profiles;
$$;
