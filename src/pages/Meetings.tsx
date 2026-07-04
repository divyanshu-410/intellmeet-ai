import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Video, Plus, Search, ArrowRight, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Meeting = { id: string; title: string; description: string | null; status: string; created_at: string; room_code: string; host_id: string };

export default function Meetings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("meetings").select("*").order("created_at", { ascending: false });
      setMeetings((data || []) as Meeting[]);
      setLoading(false);
    })();
  }, []);

  const filtered = meetings.filter(m => m.title.toLowerCase().includes(q.toLowerCase()) || m.room_code.includes(q));

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/app/meetings/join/${code}`);
    toast.success("Invite link copied");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground mt-1">All your video meetings and history.</p>
        </div>
        <Button onClick={() => navigate("/app/meetings/new")} className="bg-gradient-primary text-white hover:opacity-90 shadow-glow">
          <Plus className="h-4 w-4 mr-2" />New meeting
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search meetings or room code..." value={q} onChange={e => setQ(e.target.value)} className="pl-10 h-11" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="font-display font-semibold text-lg mb-2">No meetings yet</h3>
            <p className="text-muted-foreground mb-4">Start your first AI-powered meeting.</p>
            <Button onClick={() => navigate("/app/meetings/new")} className="bg-gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />Create meeting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
            <Card key={m.id} className="border-border hover:shadow-elevated hover:-translate-y-0.5 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                  <Badge variant="outline" className={
                    m.status === "live" ? "bg-success/10 text-success border-success/30" :
                    m.status === "scheduled" ? "bg-primary/10 text-primary border-primary/30" :
                    "bg-muted text-muted-foreground"
                  }>{m.status}</Badge>
                </div>
                <h3 className="font-display font-semibold mb-1 line-clamp-1">{m.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">Room: <code className="bg-secondary px-1.5 py-0.5 rounded">{m.room_code}</code></p>
                <p className="text-xs text-muted-foreground mb-4">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="flex-1 bg-gradient-primary text-white hover:opacity-90">
                    <Link to={`/app/meetings/${m.id}`}>{m.status === "ended" ? "View" : "Join"} <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(m.room_code)}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
