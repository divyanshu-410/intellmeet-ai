import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Segment = { id: string; speaker_name: string | null; text: string; created_at: string };

// ElevenLabs realtime via official SDK (client-side, with single-use token from edge function)
export function MeetingTranscript({ meetingId }: { meetingId: string }) {
  const { user, profile } = useAuth();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [partial, setPartial] = useState("");
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history + subscribe
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("transcripts").select("*").eq("meeting_id", meetingId).order("created_at");
      setSegments((data || []) as Segment[]);
    })();
    const ch = supabase.channel(`tr:${meetingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transcripts", filter: `meeting_id=eq.${meetingId}` },
        (p) => setSegments(prev => [...prev, p.new as Segment]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [meetingId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [segments, partial]);

  const start = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scribe-token");
      if (error || !data?.token) throw new Error(error?.message || "No token");
      const token = data.token;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } });
      mediaStreamRef.current = stream;

      const ws = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/scribe-realtime?authorization=${token}&model=scribe_v2_realtime&audio_format=pcm_16000`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        const ctx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        procRef.current = proc;
        source.connect(proc);
        proc.connect(ctx.destination);
        proc.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = ev.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          ws.send(pcm.buffer);
        };
        setIsRecording(true);
        setConnecting(false);
      };

      ws.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data));
          if (msg.type === "partial_transcript" && msg.text) {
            setPartial(msg.text);
          } else if (msg.type === "committed_transcript" && msg.text) {
            setPartial("");
            await supabase.from("transcripts").insert({
              meeting_id: meetingId,
              user_id: user.id,
              speaker_name: profile?.display_name || "You",
              text: msg.text,
            });
          }
        } catch {}
      };

      ws.onerror = () => {
        toast.error("Transcription connection error");
        stop();
      };
      ws.onclose = () => setIsRecording(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to start transcription");
      setConnecting(false);
    }
  };

  const stop = () => {
    procRef.current?.disconnect();
    audioCtxRef.current?.close();
    wsRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    procRef.current = null;
    audioCtxRef.current = null;
    wsRef.current = null;
    mediaStreamRef.current = null;
    setIsRecording(false);
    setPartial("");
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="font-display font-semibold text-sm">Live transcript</div>
        <Button
          size="sm"
          variant={isRecording ? "destructive" : "default"}
          className={!isRecording ? "bg-gradient-primary text-white" : ""}
          onClick={isRecording ? stop : start}
          disabled={connecting}
        >
          {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : isRecording ? <MicOff className="h-3.5 w-3.5 mr-1.5" /> : <Mic className="h-3.5 w-3.5 mr-1.5" />}
          {isRecording ? "Stop" : "Record"}
        </Button>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4 space-y-3">
          {segments.length === 0 && !partial && (
            <p className="text-xs text-muted-foreground text-center py-8">Click <strong>Record</strong> to capture a live AI transcript.</p>
          )}
          {segments.map(s => (
            <div key={s.id} className="text-sm">
              <span className="text-xs font-medium text-primary">{s.speaker_name || "Speaker"}</span>
              <p className="text-foreground/90 leading-relaxed">{s.text}</p>
            </div>
          ))}
          {partial && (
            <div className="text-sm">
              <span className="text-xs font-medium text-accent">{profile?.display_name || "You"} (live)</span>
              <p className="text-muted-foreground italic leading-relaxed">{partial}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
