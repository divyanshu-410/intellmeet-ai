import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { z } from "zod";

const messageSchema = z.string().trim().min(1).max(2000);

type Msg = { id: string; user_id: string; content: string; created_at: string; profile?: { display_name: string | null; avatar_url: string | null } };

export function MeetingChat({ meetingId }: { meetingId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const profileCache = useRef<Map<string, { display_name: string | null; avatar_url: string | null }>>(new Map());

  const enrich = async (msgs: Msg[]) => {
    const ids = [...new Set(msgs.map(m => m.user_id).filter(id => !profileCache.current.has(id)))];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids);
      data?.forEach((p: any) => profileCache.current.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }));
    }
    return msgs.map(m => ({ ...m, profile: profileCache.current.get(m.user_id) }));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("meeting_id", meetingId).order("created_at");
      const enriched = await enrich((data || []) as Msg[]);
      setMessages(enriched);
    })();

    const ch = supabase
      .channel(`messages:${meetingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `meeting_id=eq.${meetingId}` },
        async (payload) => {
          const enriched = await enrich([payload.new as Msg]);
          setMessages(prev => [...prev, ...enriched]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [meetingId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!user) return;
    const v = messageSchema.safeParse(text);
    if (!v.success) return;
    const content = v.data;
    setText("");
    await supabase.from("messages").insert({ meeting_id: meetingId, user_id: user.id, content });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border font-display font-semibold text-sm">Chat</div>
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4 space-y-3">
          {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Say hi 👋</p>}
          {messages.map(m => {
            const initials = (m.profile?.display_name || "U").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px] bg-gradient-primary text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="text-[10px] text-muted-foreground mb-0.5 px-1">{m.profile?.display_name || "User"}</div>
                  <div className={`text-sm rounded-2xl px-3 py-1.5 break-words ${isMe ? "bg-gradient-primary text-white" : "bg-secondary"}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border flex gap-2">
        <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message..." maxLength={2000} />
        <Button onClick={send} size="icon" className="bg-gradient-primary text-white shrink-0"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
