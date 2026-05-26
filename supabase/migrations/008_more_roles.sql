-- Migration 008: 擴充身分選項
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'reporter', 'technician', 'manager', 'admin',
    'nightshift', 'frontdesk',
    'frontdesk_night', 'frontdesk_day',
    'housekeeper', 'admin_staff', 'sales'
  ));
