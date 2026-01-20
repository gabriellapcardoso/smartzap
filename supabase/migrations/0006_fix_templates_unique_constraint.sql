-- Migration: Fix templates unique constraint
-- Problem: Templates can have the same name but different languages (e.g., "welcome" in pt_BR and en_US)
-- The current UNIQUE (name) constraint causes conflicts during Meta template sync

-- Step 1: Drop the old constraint that only considers name
ALTER TABLE public.templates
DROP CONSTRAINT IF EXISTS templates_name_key;

-- Step 2: Add the correct composite unique constraint (name + language)
-- This allows templates with the same name if they have different languages
ALTER TABLE public.templates
ADD CONSTRAINT templates_name_language_key UNIQUE (name, language);

-- Step 3: Create an index to improve query performance on name lookups
-- (The unique constraint already creates an index, but adding explicit comment for clarity)
COMMENT ON CONSTRAINT templates_name_language_key ON public.templates IS
'Templates are unique per name+language combination. Allows same template name in different languages.';
