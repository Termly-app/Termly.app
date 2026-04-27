-- Fix teacher_assignments foreign key constraint
-- The table was incorrectly referencing public.users(id) instead of public.teachers(id)
-- This caused errors when assigning teachers who didn't have a user account.

ALTER TABLE public.teacher_assignments 
DROP CONSTRAINT IF EXISTS teacher_assignments_teacher_id_fkey;

-- Re-add pointing to the correct table (teachers)
-- Note: We keep ON DELETE CASCADE so that if a teacher profile is deleted, their assignments are also removed.
ALTER TABLE public.teacher_assignments
ADD CONSTRAINT teacher_assignments_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

-- Also verify if stream_id is correct (it should reference class_streams)
-- Looking at the schema, it already does, but let's be sure.
-- ALTER TABLE public.teacher_assignments 
-- DROP CONSTRAINT IF EXISTS teacher_assignments_stream_id_fkey;
-- ALTER TABLE public.teacher_assignments
-- ADD CONSTRAINT teacher_assignments_stream_id_fkey 
-- FOREIGN KEY (stream_id) REFERENCES public.class_streams(id) ON DELETE CASCADE;
