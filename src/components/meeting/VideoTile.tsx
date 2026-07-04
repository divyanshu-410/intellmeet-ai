import { useEffect, useRef } from "react";
import { MicOff, VideoOff } from "lucide-react";

export function VideoTile({ stream, name, muted, isLocal }: { stream: MediaStream | null; name: string; muted?: boolean; isLocal?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  const hasVideo = !!stream?.getVideoTracks().some(t => t.enabled);
  const hasAudio = !!stream?.getAudioTracks().some(t => t.enabled);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-sidebar shadow-soft">
      {stream ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""} ${!hasVideo ? "invisible" : ""}`}
        />
      ) : null}
      {!hasVideo && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-sidebar to-sidebar-accent">
          <div className="h-20 w-20 rounded-full bg-gradient-primary grid place-items-center text-white text-2xl font-display font-bold shadow-glow">
            {name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur text-white text-xs font-medium">{name}</div>
        <div className="flex gap-1">
          {!hasAudio && <div className="h-7 w-7 rounded-lg bg-destructive/90 grid place-items-center"><MicOff className="h-3.5 w-3.5 text-white" /></div>}
          {!hasVideo && <div className="h-7 w-7 rounded-lg bg-black/50 backdrop-blur grid place-items-center"><VideoOff className="h-3.5 w-3.5 text-white" /></div>}
        </div>
      </div>
    </div>
  );
}
