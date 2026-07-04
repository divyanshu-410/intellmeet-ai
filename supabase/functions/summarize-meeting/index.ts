import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { meetingId } = await req.json();
    if (!meetingId || typeof meetingId !== "string") {
      return new Response(JSON.stringify({ error: "meetingId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch transcripts
    const { data: transcripts } = await admin
      .from("transcripts")
      .select("speaker_name, text, created_at")
      .eq("meeting_id", meetingId)
      .order("created_at");

    // Fetch chat as fallback context
    const { data: messages } = await admin
      .from("messages")
      .select("user_id, content, created_at")
      .eq("meeting_id", meetingId)
      .order("created_at");

    let transcriptText = "";
    if (transcripts && transcripts.length) {
      transcriptText = transcripts.map((t: any) => `${t.speaker_name || "Speaker"}: ${t.text}`).join("\n");
    } else if (messages && messages.length) {
      transcriptText = messages.map((m: any) => `User: ${m.content}`).join("\n");
    } else {
      return new Response(JSON.stringify({ error: "No transcript or messages to summarize." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway with tool calling for structured output
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You analyze meeting transcripts. Extract a clean summary, key points, and concrete action items." },
          { role: "user", content: `Transcript:\n\n${transcriptText.slice(0, 24000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_meeting_insights",
            description: "Extract summary, key points and action items from a meeting transcript.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-4 sentence executive summary" },
                key_points: { type: "array", items: { type: "string" }, description: "3-7 key decisions or insights" },
                action_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["title", "priority"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["summary", "key_points", "action_items"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_meeting_insights" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiRes.text();
      throw new Error(`AI failed [${aiRes.status}]: ${t}`);
    }
    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured output from AI");
    const args = JSON.parse(toolCall.function.arguments);

    // Persist summary
    await admin.from("summaries").upsert({
      meeting_id: meetingId,
      summary: args.summary,
      key_points: args.key_points,
    }, { onConflict: "meeting_id" });

    // Persist action items as tasks
    if (Array.isArray(args.action_items) && args.action_items.length) {
      const rows = args.action_items.map((a: any) => ({
        title: String(a.title).slice(0, 160),
        priority: ["low","medium","high"].includes(a.priority) ? a.priority : "medium",
        status: "todo",
        created_by: user.id,
        assignee_id: user.id,
        meeting_id: meetingId,
      }));
      await admin.from("tasks").insert(rows);
    }

    return new Response(JSON.stringify({
      summary: args.summary,
      key_points: args.key_points,
      action_items: args.action_items,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("summarize-meeting error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
