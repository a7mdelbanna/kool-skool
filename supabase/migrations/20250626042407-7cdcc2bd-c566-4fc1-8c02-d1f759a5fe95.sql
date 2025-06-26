
-- Delete all subscriptions to start fresh
-- This will also cascade delete all related lesson_sessions due to foreign key constraints
DELETE FROM public.subscriptions;

-- Reset any sequences if needed (though we're using UUIDs, so this isn't necessary)
-- Just to be thorough, let's also ensure no orphaned lesson sessions exist
DELETE FROM public.lesson_sessions WHERE subscription_id NOT IN (SELECT id FROM public.subscriptions);

-- Verify cleanup
SELECT COUNT(*) as remaining_subscriptions FROM public.subscriptions;
SELECT COUNT(*) as remaining_sessions FROM public.lesson_sessions;
