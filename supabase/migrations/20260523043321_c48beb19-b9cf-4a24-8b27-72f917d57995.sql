
-- 1. Drop email column from profiles (exposed sensitive data; available via auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update signup trigger to no longer write email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$function$;

-- 2. Tighten meetings SELECT: only host or participant
DROP POLICY IF EXISTS "Authenticated view meetings" ON public.meetings;
CREATE POLICY "Members view meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR public.is_meeting_member(id, auth.uid()));

-- 3. Tighten meeting_participants SELECT: only members of same meeting
DROP POLICY IF EXISTS "Authenticated view participants" ON public.meeting_participants;
CREATE POLICY "Members view participants"
  ON public.meeting_participants FOR SELECT TO authenticated
  USING (public.is_meeting_member(meeting_id, auth.uid()));

-- 4. Tighten tasks SELECT: only creator, assignee, or meeting member
DROP POLICY IF EXISTS "Authenticated view tasks" ON public.tasks;
CREATE POLICY "Related users view tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assignee_id
    OR (meeting_id IS NOT NULL AND public.is_meeting_member(meeting_id, auth.uid()))
  );

-- 5. Lock down trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 6. Realtime channel authorization: only meeting members can subscribe to meeting:<id> topics
-- Helper to check membership from realtime topic
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _meeting_id uuid;
BEGIN
  IF _topic IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  -- Expect topics like "meeting:<uuid>"
  IF _topic LIKE 'meeting:%' THEN
    BEGIN
      _meeting_id := substring(_topic from 9)::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.is_meeting_member(_meeting_id, auth.uid());
  END IF;
  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_realtime_topic(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated;

-- RLS policies on realtime.messages to scope subscriptions/broadcasts
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meeting members can read realtime" ON realtime.messages;
CREATE POLICY "Meeting members can read realtime"
  ON realtime.messages FOR SELECT TO authenticated
  USING (public.can_access_realtime_topic((SELECT realtime.topic())));

DROP POLICY IF EXISTS "Meeting members can send realtime" ON realtime.messages;
CREATE POLICY "Meeting members can send realtime"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (public.can_access_realtime_topic((SELECT realtime.topic())));
