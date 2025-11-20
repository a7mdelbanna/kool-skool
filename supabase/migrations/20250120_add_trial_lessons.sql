-- ⚠️ WARNING: THIS FILE IS NON-FUNCTIONAL AND FOR DOCUMENTATION ONLY ⚠️
--
-- This project uses FIREBASE/FIRESTORE, not PostgreSQL/Supabase.
-- This SQL migration file WILL NOT BE EXECUTED.
--
-- This file documents the database schema changes that were needed for trial lessons,
-- but the actual implementation happens in Firebase through the code (Firestore is schemaless).
--
-- The trial lessons feature works through:
-- 1. TypeScript types in /src/types/trial.types.ts
-- 2. Service layer in /src/services/trialLesson.service.ts
-- 3. SupabaseToFirebase compatibility layer in /src/services/migration/supabaseToFirebase.ts
--
-- DO NOT ATTEMPT TO RUN THIS SQL FILE!
--
-- ============================================================================

-- Migration: Add Trial Lessons Support
-- Date: 2025-01-20
-- Description: Add fields to support trial lessons (пробные уроки) in subscriptions table
-- NOTE: This is PostgreSQL/Supabase syntax - not applicable to Firebase

-- Step 1: Add new columns for trial functionality
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS subscription_type varchar(20) DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_completed_at timestamp,
  ADD COLUMN IF NOT EXISTS converted_to_subscription_id uuid;

-- Step 2: Add check constraint for subscription_type
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS check_subscription_type;

ALTER TABLE subscriptions
  ADD CONSTRAINT check_subscription_type
  CHECK (subscription_type IN ('individual', 'group', 'trial'));

-- Step 3: Add foreign key for converted subscription
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS fk_converted_subscription;

ALTER TABLE subscriptions
  ADD CONSTRAINT fk_converted_subscription
  FOREIGN KEY (converted_to_subscription_id)
  REFERENCES subscriptions(id)
  ON DELETE SET NULL;

-- Step 4: Add unique constraint - one trial per student per school
-- This enforces business rule: students can only have one trial lesson
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_trial_per_student
  ON subscriptions(school_id, student_id, subscription_type)
  WHERE subscription_type = 'trial' AND status != 'cancelled';

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_type
  ON subscriptions(subscription_type)
  WHERE subscription_type = 'trial';

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_status
  ON subscriptions(is_trial, trial_completed)
  WHERE is_trial = true;

CREATE INDEX IF NOT EXISTS idx_subscriptions_conversion
  ON subscriptions(converted_to_subscription_id)
  WHERE converted_to_subscription_id IS NOT NULL;

-- Step 6: Update existing subscriptions to set subscription_type
UPDATE subscriptions
SET subscription_type = CASE
    WHEN group_id IS NOT NULL THEN 'group'
    ELSE 'individual'
  END,
  is_trial = false
WHERE subscription_type IS NULL OR subscription_type = 'individual';

-- Step 7: Add helpful comments
COMMENT ON COLUMN subscriptions.subscription_type IS
  'Type of subscription: individual (1-on-1), group (group lessons), or trial (пробный урок - trial lesson)';

COMMENT ON COLUMN subscriptions.is_trial IS
  'Flag indicating if this is a trial lesson subscription';

COMMENT ON COLUMN subscriptions.trial_completed IS
  'Whether the trial lesson has been completed by the student';

COMMENT ON COLUMN subscriptions.trial_completed_at IS
  'Timestamp when trial lesson was marked as completed';

COMMENT ON COLUMN subscriptions.converted_to_subscription_id IS
  'Reference to the regular subscription created after converting from trial (if converted)';
