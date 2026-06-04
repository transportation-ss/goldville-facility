-- Migration 020: 新增 tech_housekeeping 組合身分（工務＋房務）
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
    'admin_staff', 'sales',
    'nightshift', 'frontdesk', 'reporter'
  ));
