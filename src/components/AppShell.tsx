import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Video, KanbanSquare, Sparkles, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/meetings", icon: Video, label: "Meetings" },
  { to: "/app/tasks", icon: KanbanSquare, label: "Tasks" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = (profile?.display_name || user?.email || "U")
    .split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const isActive = (to: string, end?: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen flex bg-gradient-soft">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-6 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-none">IntellMeet</div>
            <div className="text-xs text-sidebar-foreground/60 mt-1">AI Collaboration</div>
          </div>
        </div>

        <div className="px-3 mb-2">
          <Button
            onClick={() => navigate("/app/meetings/new")}
            className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-glow"
          >
            <Plus className="h-4 w-4 mr-2" />New Meeting
          </Button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive(to, end)
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-primary text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{profile?.display_name || "User"}</div>
              <div className="flex items-center gap-1.5">
                {isAdmin && <Badge className="h-4 px-1.5 text-[10px] bg-accent text-accent-foreground">Admin</Badge>}
                <span className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email}</span>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => { signOut(); navigate("/"); }} className="h-8 w-8 text-sidebar-foreground hover:text-white hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
