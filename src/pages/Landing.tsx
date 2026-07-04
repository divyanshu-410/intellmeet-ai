import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, Video, MessageSquare, Brain, KanbanSquare, Users, Zap, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: Video, title: "HD Video Meetings", desc: "Crystal-clear video with screen sharing and real-time controls." },
  { icon: Brain, title: "AI Transcription", desc: "Automatic speech-to-text in 99+ languages with speaker diarization." },
  { icon: Sparkles, title: "AI Summaries", desc: "Get bullet-point summaries and key decisions instantly after every call." },
  { icon: KanbanSquare, title: "Action Items", desc: "AI extracts tasks from your meeting and drops them into your Kanban." },
  { icon: MessageSquare, title: "Live Chat", desc: "Real-time chat alongside your video — no context lost." },
  { icon: ShieldCheck, title: "Secure by Default", desc: "JWT auth, role-based access, encrypted data at rest." },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg">IntellMeet</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild className="bg-gradient-primary text-white hover:opacity-90"><Link to="/app">Open app</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
                <Button asChild className="bg-gradient-primary text-white hover:opacity-90 shadow-glow"><Link to="/auth">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-soft" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />

        <div className="container relative py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-3.5 w-3.5" /> Now with live AI transcription
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-6">
              Meetings that <span className="text-gradient-primary">actually</span> get work done.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              IntellMeet combines HD video, real-time chat, and AI that turns every conversation into transcripts, summaries, and action items.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-gradient-primary text-white hover:opacity-90 shadow-glow text-base h-12 px-7">
                <Link to="/auth">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base h-12 px-7">
                <a href="#features">See features</a>
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Free forever plan</span>
            </div>
          </motion.div>

          {/* Mock product card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="rounded-3xl border border-border bg-card shadow-elevated overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
                <div className="bg-card p-6">
                  <div className="aspect-video rounded-xl bg-gradient-primary mb-4 grid place-items-center">
                    <Video className="h-10 w-10 text-white/80" />
                  </div>
                  <h4 className="font-display font-semibold mb-1">Live meeting</h4>
                  <p className="text-sm text-muted-foreground">HD video, screen share, recording.</p>
                </div>
                <div className="bg-card p-6">
                  <div className="aspect-video rounded-xl bg-secondary mb-4 p-4 flex flex-col gap-2">
                    <div className="text-xs font-medium text-primary">AI Transcript</div>
                    <div className="text-sm">"Let's ship the redesign by Friday."</div>
                    <div className="text-xs text-muted-foreground">— Sarah, 14:32</div>
                  </div>
                  <h4 className="font-display font-semibold mb-1">Live captions</h4>
                  <p className="text-sm text-muted-foreground">Real-time transcription with speakers.</p>
                </div>
                <div className="bg-card p-6">
                  <div className="aspect-video rounded-xl bg-accent/10 mb-4 p-4">
                    <div className="text-xs font-medium text-accent mb-2">✨ AI Summary</div>
                    <ul className="text-sm space-y-1">
                      <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-success mt-0.5" />Ship redesign Friday</li>
                      <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-success mt-0.5" />Sarah owns API</li>
                    </ul>
                  </div>
                  <h4 className="font-display font-semibold mb-1">Action items</h4>
                  <p className="text-sm text-muted-foreground">Auto-assigned to your Kanban.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Everything your team needs</h2>
          <p className="text-lg text-muted-foreground">Video, chat, AI insights, and tasks — all in one place.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-7 rounded-2xl bg-card border border-border hover:shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-primary grid place-items-center mb-4 shadow-glow">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="bg-secondary/40 py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">From meeting to action in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { n: "01", t: "Start a meeting", d: "Create a room and invite teammates with a single link." },
              { n: "02", t: "AI listens", d: "Live transcription captures every word with speaker labels." },
              { n: "03", t: "Get the work done", d: "AI summary + action items land in your dashboard." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="text-5xl font-display font-bold text-gradient-primary mb-3">{s.n}</div>
                <h3 className="font-display font-semibold text-lg mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <div className="rounded-3xl bg-gradient-hero p-12 md:p-16 text-center text-white shadow-elevated">
          <Users className="h-12 w-12 mx-auto mb-6 opacity-90" />
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Ready to upgrade your meetings?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">Join teams using IntellMeet to ship faster.</p>
          <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8 text-base font-semibold">
            <Link to="/auth">Get started free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>© 2026 IntellMeet</span>
          </div>
          <div>AI-powered meetings & collaboration</div>
        </div>
      </footer>
    </div>
  );
}
