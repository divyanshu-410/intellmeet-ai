import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type Task = {
  id: string; title: string; description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignee_id: string | null; created_by: string; due_date: string | null;
};
type Profile = { user_id: string; display_name: string | null };

const COLUMNS: { id: Task["status"]; label: string; accent: string }[] = [
  { id: "todo", label: "To do", accent: "border-t-muted-foreground" },
  { id: "in_progress", label: "In progress", accent: "border-t-primary" },
  { id: "done", label: "Done", accent: "border-t-success" },
];

const taskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
});

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks((data || []) as Task[]);
    const ids = [...new Set((data || []).flatMap((t: any) => [t.assignee_id, t.created_by].filter(Boolean)))];
    if (ids.length) {
      const { data: pp } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      const m = new Map<string, Profile>();
      pp?.forEach((p: any) => m.set(p.user_id, p));
      setProfiles(m);
    }
  };

  useEffect(() => { load(); }, []);

  const createTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const v = taskSchema.safeParse({
      title: fd.get("title"),
      description: fd.get("description") || undefined,
    });
    if (!v.success) return toast.error(v.error.issues[0].message);
    const { error } = await supabase.from("tasks").insert({
      title: v.data.title,
      description: v.data.description || null,
      priority: (fd.get("priority") as Task["priority"]) || "medium",
      created_by: user.id,
      assignee_id: user.id,
    });
    if (error) return toast.error(error.message);
    setOpen(false);
    toast.success("Task created");
    load();
  };

  const move = async (taskId: string, status: Task["status"]) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) { toast.error("Could not update task"); load(); }
  };

  const remove = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Drag cards across columns to update status.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-white hover:opacity-90 shadow-glow"><Plus className="h-4 w-4 mr-2" />New task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
            <form onSubmit={createTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required maxLength={160} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" maxLength={1000} className="mt-1.5" />
              </div>
              <div>
                <Label>Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-gradient-primary text-white">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (draggedId) { move(draggedId, col.id); setDraggedId(null); } }}
              className={`rounded-2xl bg-secondary/40 border-t-4 ${col.accent} p-3 min-h-[400px]`}
            >
              <div className="flex items-center justify-between px-2 py-2 mb-2">
                <h3 className="font-display font-semibold text-sm">{col.label}</h3>
                <Badge variant="outline" className="bg-background">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTasks.map(t => {
                  const assignee = t.assignee_id ? profiles.get(t.assignee_id) : null;
                  const initials = assignee?.display_name?.split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase() || "?";
                  return (
                    <Card
                      key={t.id}
                      draggable
                      onDragStart={() => setDraggedId(t.id)}
                      className="cursor-grab active:cursor-grabbing hover:shadow-soft transition group"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-snug">{t.title}</div>
                            {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                          </div>
                          {(t.created_by === user?.id) && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(t.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={
                            t.priority === "high" ? "border-destructive text-destructive" :
                            t.priority === "low" ? "border-muted-foreground text-muted-foreground" :
                            "border-warning text-warning"
                          }>{t.priority}</Badge>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-gradient-primary text-white">{initials}</AvatarFallback>
                          </Avatar>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {colTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Drop tasks here</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
