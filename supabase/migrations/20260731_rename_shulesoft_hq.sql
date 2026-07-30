-- Rename ShuleSoft HQ to Termly HQ
UPDATE public.schools
SET name = 'Termly HQ'
WHERE name ILIKE '%shulesoft hq%';
