-- Migration 050: 新增 accounting（會計）身分

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'admin', 'manager',
    'frontdesk_night', 'frontdesk_day',
    'technician', 'procurement',
    'housekeeper', 'housekeeping',
    'tech_housekeeping',
    'butler_manager', 'butler',
    'admin_staff', 'sales',
    'nightshift', 'frontdesk', 'reporter',
    'accounting'
  ));
