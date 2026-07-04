import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SignalPayload =
  | { type: "join"; from: string; name: string }
  | { type: "hello"; from: string; name: string }
  | { type: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: "leave"; from: string };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type RemoteStream = { id: string; name: string; stream: MediaStream };

export function useWebRTC(meetingId: string, userId: string, displayName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [connected, setConnected] = useState(false);

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  const ensureMediaAvailable = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const e: any = new Error("getUserMedia unavailable");
      e.name = "InsecureContextError";
      throw e;
    }

    const inIframe = window.self !== window.top;
    if (inIframe) {
      const policy = (document as any).featurePolicy || (document as any).permissionsPolicy;
      const allowsCamera = policy?.allowsFeature?.("camera");
      if (allowsCamera === false) {
        const e: any = new Error("Camera blocked in embedded preview");
        e.name = "IframePermissionError";
        throw e;
      }
    }
  }, []);

  const isEmbeddedPreview = useCallback(() => window.self !== window.top, []);

  const getBestLocalStream = useCallback(async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (mediaErr: any) {
      const name = mediaErr?.name;
      if (name !== "NotFoundError" && name !== "OverconstrainedError" && name !== "DevicesNotFoundError") {
        throw mediaErr;
      }

      try {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          return new MediaStream();
        }
      }
    }
  }, []);

  const sendOffer = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "offer", from: userId, to: peerId, sdp: offer } as SignalPayload,
    });
  }, [userId]);

  const updateRemote = useCallback((peerId: string, stream: MediaStream | null, name?: string) => {
    setRemoteStreams(prev => {
      const filtered = prev.filter(r => r.id !== peerId);
      if (!stream) return filtered;
      return [...filtered, { id: peerId, name: name || peerNamesRef.current.get(peerId) || "Guest", stream }];
    });
  }, []);

  const createPeer = useCallback((peerId: string, isInitiator: boolean) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(peerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (e) => {
      updateRemote(peerId, e.streams[0]);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "ice", from: userId, to: peerId, candidate: e.candidate.toJSON() } as SignalPayload,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        updateRemote(peerId, null);
      }
    };

    if (isInitiator) {
      (async () => {
        await sendOffer(peerId, pc);
      })();
    }

    return pc;
  }, [sendOffer, updateRemote, userId]);

  const flushIce = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current.get(peerId);
    if (queued && queued.length) {
      for (const c of queued) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { }
      }
      pendingIceRef.current.delete(peerId);
    }
  }, []);

  const connectTo = useCallback((peerId: string, name: string) => {
    peerNamesRef.current.set(peerId, name);
    // Deterministic initiator: lower id creates the offer to avoid glare.
    if (userId < peerId) {
      createPeer(peerId, true);
    }
  }, [userId, createPeer]);

  const handleSignal = useCallback(async (payload: SignalPayload) => {
    if (payload.from === userId) return;

    if (payload.type === "join") {
      // A new participant arrived: announce ourselves so they discover us too.
      channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "hello", from: userId, name: displayName } as SignalPayload,
      });
      connectTo(payload.from, payload.name);
    } else if (payload.type === "hello") {
      connectTo(payload.from, payload.name);
    } else if (payload.type === "offer" && payload.to === userId) {
      const pc = createPeer(payload.from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await flushIce(payload.from, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "answer", from: userId, to: payload.from, sdp: answer } as SignalPayload,
      });
    } else if (payload.type === "answer" && payload.to === userId) {
      const pc = peersRef.current.get(payload.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushIce(payload.from, pc);
      }
    } else if (payload.type === "ice" && payload.to === userId) {
      const pc = peersRef.current.get(payload.from);
      if (pc && pc.remoteDescription && payload.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { }
      } else if (payload.candidate) {
        const list = pendingIceRef.current.get(payload.from) || [];
        list.push(payload.candidate);
        pendingIceRef.current.set(payload.from, list);
      }
    } else if (payload.type === "leave") {
      const pc = peersRef.current.get(payload.from);
      pc?.close();
      peersRef.current.delete(payload.from);
      pendingIceRef.current.delete(payload.from);
      updateRemote(payload.from, null);
    }
  }, [userId, displayName, createPeer, connectTo, flushIce, updateRemote]);

  const start = useCallback(async () => {
    try {
      ensureMediaAvailable();

      const stream = await getBestLocalStream();
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      setIsVideoOn(stream.getVideoTracks().length > 0);
      setIsAudioOn(stream.getAudioTracks().length > 0);
      setLocalStream(stream);


      const channel = supabase.channel(`meeting:${meetingId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel.on("broadcast", { event: "signal" }, ({ payload }) => handleSignal(payload as SignalPayload));

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "join", from: userId, name: displayName } as SignalPayload,
          });
          setConnected(true);
        }
      });
    } catch (err) {
      console.error("getUserMedia failed", err);
      throw err;
    }
  }, [meetingId, userId, displayName, handleSignal, ensureMediaAvailable, getBestLocalStream]);

  const stop = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "leave", from: userId } as SignalPayload,
    });
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    pendingIceRef.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams([]);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    setConnected(false);
  }, [userId]);

  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (track && track.readyState === "live") {
      track.enabled = !track.enabled;
      setIsVideoOn(track.enabled);
      return;
    }

    ensureMediaAvailable();
    let cameraStream: MediaStream;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err: any) {
      if ((err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") && isEmbeddedPreview()) {
        const e: any = new Error("Camera unavailable in embedded preview");
        e.name = "PreviewCameraUnavailableError";
        throw e;
      }
      throw err;
    }
    const cameraTrack = cameraStream.getVideoTracks()[0];
    if (!cameraTrack) return;

    cameraTrackRef.current = cameraTrack;
    stream.getVideoTracks().forEach(oldTrack => {
      stream.removeTrack(oldTrack);
      oldTrack.stop();
    });
    stream.addTrack(cameraTrack);
    setLocalStream(new MediaStream(stream.getTracks()));
    setIsVideoOn(true);

    await Promise.all(Array.from(peersRef.current.entries()).map(async ([peerId, pc]) => {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(cameraTrack);
      } else {
        pc.addTrack(cameraTrack, stream);
        await sendOffer(peerId, pc);
      }
    }));
  }, [ensureMediaAvailable, sendOffer, isEmbeddedPreview]);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioOn(track.enabled);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;
    if (isSharing) {
      if (cameraTrackRef.current) {
        const sender = Array.from(peersRef.current.values())
          .flatMap(pc => pc.getSenders())
          .filter(s => s.track?.kind === "video");
        sender.forEach(s => s.replaceTrack(cameraTrackRef.current!));
        const old = localStreamRef.current.getVideoTracks()[0];
        if (old) localStreamRef.current.removeTrack(old);
        localStreamRef.current.addTrack(cameraTrackRef.current);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      setIsSharing(false);
    } else {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = display.getVideoTracks()[0];
        Array.from(peersRef.current.values())
          .flatMap(pc => pc.getSenders())
          .filter(s => s.track?.kind === "video")
          .forEach(s => s.replaceTrack(screenTrack));
        const old = localStreamRef.current.getVideoTracks()[0];
        if (old) localStreamRef.current.removeTrack(old);
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsSharing(true);
        screenTrack.onended = () => toggleScreenShare();
      } catch (e) {
        console.error("Screen share failed", e);
      }
    }
  }, [isSharing]);

  useEffect(() => () => stop(), [stop]);

  return { localStream, remoteStreams, isVideoOn, isAudioOn, isSharing, connected, start, stop, toggleVideo, toggleAudio, toggleScreenShare };
}
