import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, KanbanSquare, Sparkles, Clock, ArrowRight, Plus, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Meeting = { id: string; title: string; status: string; created_at: string; room_code: string };
type Task = { id: string; title: string; status: string; priority: string; due_date: string | null };
type Summary = { id: string; meeting_id: string; summary: string; created_at: string; meetings: { title: string } | null };

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [m, t, s] = await Promise.all([
        supabase.from("meetings").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("tasks").select("*").or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`).order("created_at", { ascending: false }).limit(6),
        supabase.from("summaries").select("*, meetings(title)").order("created_at", { ascending: false }).limit(3),
      ]);
      setMeetings((m.data || []) as Meeting[]);
      setTasks((t.data || []) as Task[]);
      setSummaries((s.data || []) as any);
      setLoading(false);
    })();
  }, [user]);

  const openTasks = tasks.filter(t => t.status !== "done").length;
  const liveMeetings = meetings.filter(m => m.status === "live").length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Hi {profile?.display_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your team.</p>
        </div>
        <Button asChild className="bg-gradient-primary text-white hover:opacity-90 shadow-glow">
          <Link to="/app/meetings/new"><Plus className="h-4 w-4 mr-2" />New meeting</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Video} label="Total meetings" value={meetings.length} accent="primary" />
        <StatCard icon={Clock} label="Live now" value={liveMeetings} accent="success" />
        <StatCard icon={KanbanSquare} label="Open tasks" value={openTasks} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent meetings */}
        <Card className="lg:col-span-2 border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg">Recent meetings</h3>
              <Button asChild variant="ghost" size="sm"><Link to="/app/meetings">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
            {loading ? <Skeleton /> : meetings.length === 0 ? (
              <EmptyState icon={Video} title="No meetings yet" cta={<Link to="/app/meetings/new">Create one</Link>} />
            ) : (
              <ul className="space-y-2">
                {meetings.map(m => (
                  <li key={m.id}>
                    <Link to={`/app/meetings/${m.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/60 transition group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center shrink-0">
                          <Video className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{m.title}</div>
                          <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</div>
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* AI Summaries */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="font-display font-semibold text-lg">AI summaries</h3>
            </div>
            {loading ? <Skeleton /> : summaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Summaries appear here after meetings.</p>
            ) : (
              <ul className="space-y-3">
                {summaries.map(s => (
                  <li key={s.id} className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <div className="text-xs font-medium text-accent mb-1">{s.meetings?.title || "Meeting"}</div>
                    <p className="text-sm line-clamp-3">{s.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="lg:col-span-3 border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg">Your tasks</h3>
              <Button asChild variant="ghost" size="sm"><Link to="/app/tasks">View board <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
            {loading ? <Skeleton /> : tasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No tasks yet" cta={<Link to="/app/tasks">Open Kanban</Link>} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.map(t => (
                  <div key={t.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-soft transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-medium text-sm">{t.title}</div>
                      <Badge variant="outline" className={
                        t.priority === "high" ? "border-destructive text-destructive" :
                        t.priority === "low" ? "border-muted-foreground text-muted-foreground" :
                        "border-warning text-warning"
                      }>{t.priority}</Badge>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  const colors: Record<string, string> = {
    primary: "bg-gradient-primary",
    success: "bg-success",
    accent: "bg-gradient-accent",
  };
  return (
    <Card className="border-border">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl ${colors[accent]} grid place-items-center shadow-glow`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-display font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; t: string }> = {
    live: { c: "bg-success/10 text-success border-success/30", t: "Live" },
    scheduled: { c: "bg-primary/10 text-primary border-primary/30", t: "Scheduled" },
    ended: { c: "bg-muted text-muted-foreground border-border", t: "Ended" },
    todo: { c: "bg-muted text-muted-foreground border-border", t: "To do" },
    in_progress: { c: "bg-primary/10 text-primary border-primary/30", t: "In progress" },
    done: { c: "bg-success/10 text-success border-success/30", t: "Done" },
  };
  const s = map[status] || map.todo;
  return <Badge variant="outline" className={s.c}>{s.t}</Badge>;
}

function Skeleton() { return <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>; }
function EmptyState({ icon: Icon, title, cta }: any) {
  return (
    <div className="text-center py-8">
      <Icon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground mb-3">{title}</p>
      <Button asChild variant="outline" size="sm">{cta}</Button>
    </div>
  );
}
