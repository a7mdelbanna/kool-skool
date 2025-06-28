
-- Create super admin account
INSERT INTO public.users (
  email,
  first_name,
  last_name,
  role,
  password_plain,
  password_hash,
  school_id
) VALUES (
  'ahmed@havenya.com',
  'Ahmed',
  'Super Admin',
  'superadmin',
  'Esmel3aresgabr1',
  'Esmel3aresgabr1', -- Using plain password as hash for now
  NULL -- Super admin doesn't belong to any specific school
);
