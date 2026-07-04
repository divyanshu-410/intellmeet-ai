import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Meetings from "./pages/Meetings";
import NewMeeting from "./pages/NewMeeting";
import MeetingRoom from "./pages/MeetingRoom";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Shell = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-right" richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            <Route path="/app" element={<Shell><Dashboard /></Shell>} />
            <Route path="/app/meetings" element={<Shell><Meetings /></Shell>} />
            <Route path="/app/meetings/new" element={<Shell><NewMeeting /></Shell>} />
            <Route path="/app/tasks" element={<Shell><Tasks /></Shell>} />

            {/* Meeting room is full-screen, no shell */}
            <Route path="/app/meetings/:id" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
