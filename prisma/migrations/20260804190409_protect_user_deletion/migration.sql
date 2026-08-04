-- Protect user accounts against accidental deletion or truncation.

CREATE OR REPLACE FUNCTION public.protect_user_data()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.allow_user_delete', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Deletion or truncation of User is blocked by database protection.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "block_user_delete" ON public."User";

CREATE TRIGGER "block_user_delete"
BEFORE DELETE ON public."User"
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_data();

DROP TRIGGER IF EXISTS "block_user_truncate" ON public."User";

CREATE TRIGGER "block_user_truncate"
BEFORE TRUNCATE ON public."User"
FOR EACH STATEMENT
EXECUTE FUNCTION public.protect_user_data();
