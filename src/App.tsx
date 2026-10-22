import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell, type PageId } from "@/components/app-shell";
import { TrafficProvider } from "@/hooks/use-traffic";
import { SessionProvider, useSession } from "@/lib/session";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { TopologyPage } from "@/pages/topology";
import { PortsPage } from "@/pages/ports";
import { ClientsPage } from "@/pages/clients";
import { LogsPage } from "@/pages/logs";
import { SettingsPage } from "@/pages/settings";
import { ToolsPage } from "@/pages/tools";
import { TerminalPage } from "@/pages/terminal";
import { AdvancedPage } from "@/pages/advanced";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5_000 },
  },
});

function Router() {
  const { connection } = useSession();
  const [page, setPage] = useState<PageId>("dashboard");

  if (!connection) return <LoginPage />;

  return (
    <TrafficProvider>
      <AppShell page={page} onNavigate={setPage}>
        {page === "dashboard" && <DashboardPage onNavigate={setPage} />}
        {page === "topology" && <TopologyPage />}
        {page === "ports" && <PortsPage />}
        {page === "clients" && <ClientsPage />}
        {page === "logs" && <LogsPage />}
        {page === "tools" && <ToolsPage />}
        {page === "terminal" && <TerminalPage />}
        {page === "advanced" && <AdvancedPage />}
        {page === "settings" && <SettingsPage onOpenAdvanced={() => setPage("advanced")} />}
      </AppShell>
    </TrafficProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <SessionProvider>
            <Router />
          </SessionProvider>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
