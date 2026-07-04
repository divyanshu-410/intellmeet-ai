-- Finding 1: meeting_participants INSERT policy must verify the meeting exists and is joinable
DROP POLICY IF EXISTS "Users add themselves" ON public.meeting_participants;
CREATE POLICY "Users add themselves"
ON public.meeting_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_participants.meeting_id
      AND m.status IN ('scheduled', 'live')
  )
);

-- Finding 2: topic-scoped realtime access control for transcript channels ("tr:<uuid>")
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _meeting_id uuid;
BEGIN
  IF _topic IS NULL OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Chat topics: "meeting:<uuid>"
  IF _topic LIKE 'meeting:%' THEN
    BEGIN
      _meeting_id := substring(_topic from 9)::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.is_meeting_member(_meeting_id, auth.uid());
  END IF;

  -- Transcript topics: "tr:<uuid>"
  IF _topic LIKE 'tr:%' THEN
    BEGIN
      _meeting_id := substring(_topic from 4)::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.is_meeting_member(_meeting_id, auth.uid());
  END IF;

  RETURN false;
END;
$function$;