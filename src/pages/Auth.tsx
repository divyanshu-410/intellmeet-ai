import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

const emailSchema = z.string().trim().email({ message: "Invalid email" }).max(255);
const passwordSchema = z.string().min(8, { message: "At least 8 characters" }).max(72);
const nameSchema = z.string().trim().min(1, { message: "Required" }).max(80);

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate("/app");
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const display_name = fd.get("display_name") as string;
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    const nv = nameSchema.safeParse(display_name);
    if (!nv.success) return toast.error(nv.error.issues[0].message);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: ev.data,
      password: pv.data,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: nv.data },
      },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! You're in.");
    navigate("/app");
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative bg-gradient-hero text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,white_0,transparent_50%)] opacity-10" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur grid place-items-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl">IntellMeet</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight mb-4">
            Meetings that get<br />work done.
          </h2>
          <p className="text-white/85 text-lg max-w-md">
            Join thousands of teams using AI-powered meetings to ship faster.
          </p>
        </div>
        <div className="relative text-sm text-white/70">© 2026 IntellMeet</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg">IntellMeet</span>
          </Link>

          <h1 className="font-display text-3xl font-bold mb-2">Welcome</h1>
          <p className="text-muted-foreground mb-8">Sign in to your account or create a new one.</p>

          <Button onClick={handleGoogle} disabled={submitting} variant="outline" className="w-full h-11 mb-6">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z" fill="#34A853"/><path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.97 10.97 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required className="mt-1.5 h-11" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-11 bg-gradient-primary text-white hover:opacity-90 shadow-glow">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="display_name">Name</Label>
                  <Input id="display_name" name="display_name" required maxLength={80} className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label htmlFor="email-su">Email</Label>
                  <Input id="email-su" name="email" type="email" required className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label htmlFor="password-su">Password</Label>
                  <Input id="password-su" name="password" type="password" required minLength={8} className="mt-1.5 h-11" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-11 bg-gradient-primary text-white hover:opacity-90 shadow-glow">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
