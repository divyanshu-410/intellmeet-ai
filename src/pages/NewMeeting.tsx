import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Video, ArrowLeft } from "lucide-react";

const titleSchema = z.string().trim().min(1, "Required").max(120);
const descSchema = z.string().trim().max(500).optional();

export default function NewMeeting() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const title = fd.get("title") as string;
    const description = fd.get("description") as string;
    const startNow = fd.get("startNow") === "on";

    const tv = titleSchema.safeParse(title);
    if (!tv.success) return toast.error(tv.error.issues[0].message);
    const dv = descSchema.safeParse(description || undefined);
    if (!dv.success) return toast.error(dv.error.issues[0].message);

    setSubmitting(true);
    const { data, error } = await supabase.from("meetings").insert({
      title: tv.data,
      description: dv.data || null,
      host_id: user.id,
      status: startNow ? "live" : "scheduled",
      started_at: startNow ? new Date().toISOString() : null,
    }).select().single();
    setSubmitting(false);

    if (error) return toast.error(error.message);
    toast.success("Meeting created");
    navigate(`/app/meetings/${data.id}`);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />Back
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
          <Video className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">New meeting</h1>
          <p className="text-muted-foreground">Set up a new AI-powered meeting.</p>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required maxLength={120} placeholder="Weekly team sync" className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" maxLength={500} placeholder="Agenda, notes..." className="mt-1.5 min-h-24" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="startNow" name="startNow" defaultChecked className="h-4 w-4 rounded border-border" />
              <Label htmlFor="startNow" className="cursor-pointer font-normal">Start meeting immediately</Label>
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-11 bg-gradient-primary text-white hover:opacity-90 shadow-glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create meeting
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
