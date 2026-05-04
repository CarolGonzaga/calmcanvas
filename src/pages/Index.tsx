import { useEffect, useState } from "react";
import { Workspace } from "@/lib/types";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { Dashboard } from "@/components/Dashboard";
import { ClientsView } from "@/components/ClientsView";
import { CalendarView } from "@/components/CalendarView";
import { ReportsView } from "@/components/ReportsView";
import { NotesView } from "@/components/NotesView";
import { Home, Users, Calendar, FileText, Heart, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";
import { useFocoData } from "@/hooks/useFocoData";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";

type View = "home" | "clients" | "calendar" | "reports" | "notes";

const Index = () => {
  const { driveService, isSyncing, login, logout } = useGoogleDrive();
  const [workspace, setWorkspace] = useState<Workspace>("saficos");
  const [view, setView] = useState<View>("home");
  const { syncAllCycles } = useFocoData();

  // seed example data on first visit
  useEffect(() => {
    if (!store.isSeeded()) {
      const today = new Date();
      const start1 = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 18));
      const start2 = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 5));
      const ws = "saficos" as Workspace;
      const sample = [
        {
          id: "demo-1",
          name: "Marca Florescer",
          startDate: start1.toISOString().slice(0, 10),
          taskTemplate: ["Planejamento mensal", "Pauta de conteúdo", "4 posts feed", "Legendas", "Stories semanais", "2 Reels", "Agendamento", "Interações", "Métricas", "Reunião"],
          workspace: ws, createdAt: new Date().toISOString(),
        },
        {
          id: "demo-2",
          name: "Estúdio Lua",
          startDate: start2.toISOString().slice(0, 10),
          taskTemplate: ["Pauta", "3 posts feed", "Stories", "1 Reel", "Agendamento", "Métricas"],
          workspace: ws, createdAt: new Date().toISOString(),
        },
      ];
      store.setClients(sample as any);
      store.markSeeded();
      syncAllCycles();
    } else {
      syncAllCycles();
    }
  }, []);

  const navItems = [
    { id: "home" as View, label: "Hoje", icon: Home },
    { id: "clients" as View, label: "Projetos", icon: Users },
    { id: "calendar" as View, label: "Calendário", icon: Calendar },
    ...(workspace === "saficos" ? [{ id: "reports" as View, label: "Relatórios", icon: FileText }] : []),
    { id: "notes" as View, label: "Notas livres", icon: FileText },
  ];

  // reset view when workspace changes if invalid
  useEffect(() => {
    const valid = navItems.some(i => i.id === view);
    if (!valid) setView(navItems[0].id);
  }, [workspace]);

  const renderView = () => {
    if (view === "clients") return <ClientsView workspace={workspace} />;
    if (view === "calendar") return <CalendarView workspace={workspace} />;
    if (view === "reports") return <ReportsView workspace={workspace} />;
    if (view === "notes") return <NotesView workspace={workspace} title="Notas Livres" subtitle="Seu espaço livre. Anote, liste, respira." />;
    return <Dashboard workspace={workspace} />;
  };


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-soft flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" fill="currentColor" />
            </div>
            <div>
              <h1 className="font-display text-lg leading-none">Foco</h1>
              <p className="text-[11px] text-muted-foreground">sua assistente silenciosa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSyncing && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
            {driveService ? (
              <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors">
                <Cloud className="w-3.5 h-3.5" /> Google Conectado
              </button>
            ) : (
              <button onClick={() => login()} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                <CloudOff className="w-3.5 h-3.5" /> Conectar Google
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6 md:py-10 space-y-6">
        <WorkspaceTabs active={workspace} onChange={setWorkspace} />

        <nav className="flex gap-1 overflow-x-auto pb-1">
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

        <div className="pb-20">{renderView()}</div>
      </main>

      <footer className="container pb-10 text-center text-xs text-muted-foreground">
        Feito com ❤️ para minha namorada mais linda.
      </footer>
    </div>
  );
};

export default Index;
