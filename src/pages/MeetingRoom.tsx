import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MeetingChat } from "@/components/meeting/MeetingChat";
import { MeetingTranscript } from "@/components/meeting/MeetingTranscript";
import { VideoTile } from "@/components/meeting/VideoTile";
import { Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Sparkles, Loader2, ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Meeting = { id: string; title: string; description: string | null; status: string; host_id: string; room_code: string };
type Summary = { summary: string; key_points: any };
type ActionItem = { id: string; title: string; status: string; assignee_id: string | null };

export default function MeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [joined, setJoined] = useState(false);

  const rtc = useWebRTC(id || "", user?.id || "anon", profile?.display_name || "Guest");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
      if (!data) { toast.error("Meeting not found"); navigate("/app/meetings"); return; }
      setMeeting(data as Meeting);
      const { data: sum } = await supabase.from("summaries").select("*").eq("meeting_id", id).maybeSingle();
      if (sum) setSummary(sum as Summary);
      const { data: tasks } = await supabase.from("tasks").select("id, title, status, assignee_id").eq("meeting_id", id);
      if (tasks) setActions(tasks as ActionItem[]);
      setLoading(false);
    })();
  }, [id, navigate]);

  const join = async () => {
    if (!user || !id) return;
    try {
      await rtc.start();
      await supabase.from("meeting_participants").upsert({ meeting_id: id, user_id: user.id, joined_at: new Date().toISOString(), left_at: null });
      if (meeting?.status === "scheduled") {
        await supabase.from("meetings").update({ status: "live", started_at: new Date().toISOString() }).eq("id", id);
      }
      setJoined(true);
    } catch (err: any) {
      if (err?.name === "IframePermissionError" || err?.name === "PreviewCameraUnavailableError") {
        toast.error("Camera is blocked in the embedded preview. Open the app in a new browser tab to grant access.", {
          action: { label: "Open", onClick: () => window.open(window.location.href, "_blank") },
        });
      } else if (err?.name === "InsecureContextError") {
        toast.error("Camera needs a secure (https) context. Open the app in a new tab.");
      } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        toast.error("Camera/mic permission denied. Enable access in your browser settings, then reload.");
      } else if (err?.name === "NotReadableError") {
        toast.error("Your camera/mic is in use by another app. Close it and try again.");
      } else {
        toast.error("Could not start the meeting. Please try again.");
      }
    }
  };

  const leave = async () => {
    rtc.stop();
    if (user && id) {
      await supabase.from("meeting_participants").update({ left_at: new Date().toISOString() }).eq("meeting_id", id).eq("user_id", user.id);
    }
    setJoined(false);
  };

  const endMeeting = async () => {
    if (!meeting || !user || meeting.host_id !== user.id) return;
    rtc.stop();
    await supabase.from("meetings").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", meeting.id);
    setMeeting({ ...meeting, status: "ended" });
    setJoined(false);
    toast.success("Meeting ended");
  };

  const generateSummary = async () => {
    if (!id) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("summarize-meeting", { body: { meetingId: id } });
    setGenerating(false);
    if (error) return toast.error(error.message);
    if (data?.summary) {
      setSummary({ summary: data.summary, key_points: data.key_points });
      toast.success("AI summary generated");
      // refetch action items
      const { data: tasks } = await supabase.from("tasks").select("id, title, status, assignee_id").eq("meeting_id", id);
      setActions((tasks || []) as ActionItem[]);
    }
  };

  const copyInvite = () => {
    if (!meeting) return;
    navigator.clipboard.writeText(`${window.location.origin}/app/meetings/${meeting.id}`);
    toast.success("Invite link copied");
  };

  const toggleVideo = async () => {
    try {
      await rtc.toggleVideo();
    } catch (err: any) {
      if (err?.name === "IframePermissionError" || err?.name === "PreviewCameraUnavailableError") {
        toast.error("Camera is blocked in the embedded preview. Open the app in a new browser tab to grant access.", {
          action: { label: "Open", onClick: () => window.open(window.location.href, "_blank") },
        });
      } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        toast.error("Camera permission denied. Enable camera access in your browser settings, then try again.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        toast.error("No camera was found. Check your device camera settings or try opening the app in Chrome/Edge.");
      } else if (err?.name === "NotReadableError") {
        toast.error("Your camera is in use by another app. Close it and try again.");
      } else {
        toast.error("Could not turn on camera. Please try again.");
      }
    }
  };

  if (loading || !meeting) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isHost = user?.id === meeting.host_id;
  const remoteCount = rtc.remoteStreams.length;
  const tilesCount = remoteCount + 1;
  // Auto-compute a balanced grid so every participant is visible and fills the space
  const cols = Math.ceil(Math.sqrt(tilesCount));
  const rows = Math.ceil(tilesCount / cols);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm"><Link to="/app/meetings"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="min-w-0">
            <h1 className="font-display font-semibold truncate">{meeting.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={
                meeting.status === "live" ? "bg-success/10 text-success border-success/30" :
                meeting.status === "ended" ? "bg-muted text-muted-foreground" :
                "bg-primary/10 text-primary border-primary/30"
              }>{meeting.status}</Badge>
              <span>Room: <code className="bg-secondary px-1 rounded">{meeting.room_code}</code></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyInvite}><Copy className="h-3.5 w-3.5 mr-1.5" />Invite</Button>
          {isHost && meeting.status !== "ended" && (
            <Button variant="outline" size="sm" onClick={endMeeting}>End meeting</Button>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        {/* Video area */}
        <div className="flex flex-col p-4 gap-4 overflow-hidden">
          <div className="flex-1 min-h-0">
            {!joined && meeting.status !== "ended" ? (
              <Card className="h-full grid place-items-center border-dashed">
                <CardContent className="text-center py-12">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-primary grid place-items-center mb-4 shadow-glow">
                    <VideoIcon className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="font-display text-xl font-bold mb-2">Ready to join?</h2>
                  <p className="text-muted-foreground mb-6">Make sure your camera and mic are enabled.</p>
                  <Button onClick={join} className="bg-gradient-primary text-white shadow-glow h-11 px-6">
                    <VideoIcon className="h-4 w-4 mr-2" />Join meeting
                  </Button>
                </CardContent>
              </Card>
            ) : meeting.status === "ended" && !summary ? (
              <Card className="h-full grid place-items-center">
                <CardContent className="text-center py-12 max-w-md">
                  <Sparkles className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold mb-2">Meeting ended</h2>
                  <p className="text-muted-foreground mb-6">Generate an AI summary and action items from the transcript.</p>
                  <Button onClick={generateSummary} disabled={generating} className="bg-gradient-accent text-white">
                    {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Sparkles className="h-4 w-4 mr-2" />Generate AI summary
                  </Button>
                </CardContent>
              </Card>
            ) : meeting.status === "ended" ? (
              <Card className="h-full overflow-auto">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <h2 className="font-display text-xl font-bold">AI Summary</h2>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap mb-6">{summary?.summary}</p>
                  {Array.isArray(summary?.key_points) && summary!.key_points.length > 0 && (
                    <>
                      <h3 className="font-display font-semibold mb-2">Key points</h3>
                      <ul className="space-y-1.5 mb-6">
                        {summary!.key_points.map((kp: string, i: number) => (
                          <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />{kp}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {actions.length > 0 && (
                    <>
                      <h3 className="font-display font-semibold mb-2">Action items</h3>
                      <ul className="space-y-2">
                        {actions.map(a => (
                          <li key={a.id} className="p-3 rounded-lg border border-border bg-secondary/30 text-sm flex items-center justify-between">
                            <span>{a.title}</span>
                            <Badge variant="outline">{a.status}</Badge>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div
                className="grid gap-3 h-full w-full auto-rows-fr"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
              >
                <VideoTile stream={rtc.localStream} name={`${profile?.display_name || "You"} (you)`} muted isLocal />
                {rtc.remoteStreams.map(r => (
                  <VideoTile key={r.id} stream={r.stream} name={r.name} />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          {joined && meeting.status !== "ended" && (
            <div className="flex justify-center gap-2 p-3 rounded-2xl bg-card border border-border shadow-soft">
              <Button onClick={rtc.toggleAudio} variant={rtc.isAudioOn ? "outline" : "destructive"} size="lg" className="rounded-full h-12 w-12 p-0">
                {rtc.isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button onClick={toggleVideo} variant={rtc.isVideoOn ? "outline" : "destructive"} size="lg" className="rounded-full h-12 w-12 p-0">
                {rtc.isVideoOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <Button onClick={rtc.toggleScreenShare} variant={rtc.isSharing ? "default" : "outline"} size="lg" className={`rounded-full h-12 w-12 p-0 ${rtc.isSharing ? "bg-primary text-primary-foreground" : ""}`}>
                {rtc.isSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
              </Button>
              <Button onClick={leave} variant="destructive" size="lg" className="rounded-full h-12 w-12 p-0">
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="border-l border-border bg-card flex flex-col h-full overflow-hidden">
          <Tabs defaultValue="chat" className="flex flex-col h-full">
            <TabsList className="grid grid-cols-2 m-3">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 overflow-hidden m-0">
              <MeetingChat meetingId={meeting.id} />
            </TabsContent>
            <TabsContent value="transcript" className="flex-1 overflow-hidden m-0">
              <MeetingTranscript meetingId={meeting.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
