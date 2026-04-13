-- =========================================================================================
-- MIGRATION: Data Sanitization Triggers
-- Purpose: Protects the database from malicious HTML payloads (XSS) and poor formatting
--          by automatically sanitizing inputs before they are persisted.
-- =========================================================================================

-- 1. Create a generic sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_string(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    -- Remove HTML elements: <any_tag>
    -- Then Trim leading/trailing whitespace
    RETURN TRIM(regexp_replace(input_text, '<[^>]*>', '', 'g'));
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger function for STUDENTS
CREATE OR REPLACE FUNCTION public.trigger_sanitize_students()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name = public.sanitize_string(NEW.name);
    NEW.adm_no = public.sanitize_string(NEW.adm_no);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_students ON public.students;
CREATE TRIGGER sanitize_students
    BEFORE INSERT OR UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sanitize_students();


-- 3. Trigger function for TEACHERS
CREATE OR REPLACE FUNCTION public.trigger_sanitize_teachers()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name = public.sanitize_string(NEW.name);
    NEW.email = public.sanitize_string(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_teachers ON public.teachers;
CREATE TRIGGER sanitize_teachers
    BEFORE INSERT OR UPDATE ON public.teachers
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sanitize_teachers();


-- 4. Trigger function for BOOKS
CREATE OR REPLACE FUNCTION public.trigger_sanitize_books()
RETURNS TRIGGER AS $$
BEGIN
    NEW.title = public.sanitize_string(NEW.title);
    NEW.author = public.sanitize_string(NEW.author);
    NEW.publisher = public.sanitize_string(NEW.publisher);
    NEW.isbn = public.sanitize_string(NEW.isbn);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_books ON public.books;
CREATE TRIGGER sanitize_books
    BEFORE INSERT OR UPDATE ON public.books
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sanitize_books();
