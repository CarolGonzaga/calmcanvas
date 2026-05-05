import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Workspace } from "@/lib/types";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { Dashboard } from "@/components/Dashboard";
import { ClientsView } from "@/components/ClientsView";
import { CalendarView } from "@/components/CalendarView";
import { ReportsView } from "@/components/ReportsView";
import { NotesView } from "@/components/NotesView";
import { ReceiptsView } from "@/components/ReceiptsView";
import {
  Home, Users, Calendar, FileText, Link as LinkIcon,
  Cloud, CloudOff, Loader2, Sun, Moon, NotebookPen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";
import { useFocoData } from "@/hooks/useFocoData";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";

type View = "home" | "clients" | "calendar" | "reports" | "notes" | "receipts";

const Index = () => {
  const { driveService, isSyncing, login, logout } = useGoogleDrive();
  const { theme, setTheme } = useTheme();
  const [workspace, setWorkspace] = useState<Workspace>("saficos");
  const { workspaces, syncAllCycles } = useFocoData();
  const [view, setView] = useState<View>("home");
  const [targetClientId, setTargetClientId] = useState<string | null>(null);

  useEffect(() => {
    if (workspaces.length > 0 && !workspaces.find(w => w.id === workspace)) {
      setWorkspace(workspaces[0].id);
      setView("home");
    }
  }, [workspaces, workspace]);

  useEffect(() => {
    if (!store.isSeeded()) {
      const today = new Date();
      const start1 = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 18));
      const start2 = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 5));
      const ws = "saficos" as Workspace;
      store.setClients([
        { id: "demo-1", name: "Marca Florescer", startDate: start1.toISOString().slice(0, 10), taskTemplate: ["Planejamento mensal", "Pauta de conteúdo", "4 posts feed", "Legendas", "Stories semanais", "2 Reels", "Agendamento", "Interações", "Métricas", "Reunião"], workspace: ws, createdAt: new Date().toISOString() },
        { id: "demo-2", name: "Estúdio Lua", startDate: start2.toISOString().slice(0, 10), taskTemplate: ["Pauta", "3 posts feed", "Stories", "1 Reel", "Agendamento", "Métricas"], workspace: ws, createdAt: new Date().toISOString() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);
      store.markSeeded();
      syncAllCycles();
    } else {
      syncAllCycles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navItems = [
    { id: "home" as View, label: "Hoje", icon: Home },
    { id: "clients" as View, label: "Tarefas", icon: Users },
    { id: "calendar" as View, label: "Calendário", icon: Calendar },
    { id: "reports" as View, label: "Relatórios", icon: FileText },
    { id: "notes" as View, label: "Notas", icon: NotebookPen },
  ];

  useEffect(() => {
    if (!navItems.some(i => i.id === view)) setView("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  const renderView = () => {
    if (view === "clients") return <ClientsView workspace={workspace} initialOpenId={targetClientId || undefined} />;
    if (view === "calendar") return <CalendarView workspace={workspace} />;
    if (view === "reports") return <ReportsView workspace={workspace} />;
    if (view === "notes") return <NotesView workspace={workspace} title="Notas Livres" subtitle="Seu espaço livre. Anote, liste, respira." />;
    if (view === "receipts") return <ReceiptsView workspace={workspace} />;
    return <Dashboard workspace={workspace} onNavigateToProject={(id) => { setTargetClientId(id); setView("clients"); }} />;
  };

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-background">
      {/* ─── HEADER ──────────────────────────────── */}
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-3 md:py-4 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary-soft flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="w-7 h-7 md:w-8 md:h-8 translate-y-[-0.5px]">
                <circle cx="32" cy="13" r="6" fill="#7C3AED" />
                <path d="M24 23 Q32 19 40 23 L38 35 Q32 39 26 35 Z" fill="#8B5CF6" />
                <path d="M26 35 Q18 39 14 43 Q18 45 26 41 Z" fill="#8B5CF6" />
                <path d="M38 35 Q46 39 50 43 Q46 45 38 41 Z" fill="#8B5CF6" />
                <circle cx="17" cy="39" r="4" fill="#A78BFA" />
                <circle cx="47" cy="39" r="4" fill="#A78BFA" />
                <circle cx="32" cy="13" r="9" stroke="#C4B5FD" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base md:text-lg leading-none">Foco</h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">sua assistente silenciosa</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isDark ? "Tema claro" : "Tema escuro"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isSyncing && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}

            {driveService ? (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
              >
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Google Conectado</span>
              </button>
            ) : (
              <button
                onClick={() => login()}
                className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Conectar Google</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────── */}
      <main className="container py-4 md:py-8 space-y-4 md:space-y-6 pb-28 md:pb-10">
        {/* Workspace selector */}
        <WorkspaceTabs active={workspace} onChange={setWorkspace} />

        {/* Desktop navigation — hidden on mobile (replaced by bottom bar) */}
        <nav className="hidden md:flex gap-1 overflow-x-auto pb-1">
          {navItems.map(it => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setView(it.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div>{renderView()}</div>
      </main>

      {/* ─── MOBILE BOTTOM NAV ────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/60">
        <div className="flex items-stretch">
          {navItems.map(it => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setView(it.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-all relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}
                <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                <span className="text-[9px] font-medium leading-none tracking-wide">
                  {it.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* iOS safe area spacer */}
        <div className="h-safe-bottom bg-card/95" style={{ height: "env(safe-area-inset-bottom)" }} />
      </nav>

      <footer className="hidden md:block container pb-10 text-center text-xs text-muted-foreground">
        Feito com ❤️ para minha namorada mais linda.
      </footer>
    </div>
  );
};

export default Index;
