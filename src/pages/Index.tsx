import { useEffect, useState } from "react";
import { Workspace } from "@/lib/types";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { Dashboard } from "@/components/Dashboard";
import { ClientsView } from "@/components/ClientsView";
import { CalendarView } from "@/components/CalendarView";
import { ReportsView } from "@/components/ReportsView";
import { NotesView } from "@/components/NotesView";
import { SimpleTasksView } from "@/components/SimpleTasksView";
import { Home, Users, Calendar, FileText, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { store } from "@/lib/storage";
import { useFocoData } from "@/hooks/useFocoData";

type View = "home" | "clients" | "calendar" | "reports" | "notes";

const Index = () => {
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

  const navItems = workspace === "saficos"
    ? [
        { id: "home" as View, label: "Hoje", icon: Home },
        { id: "clients" as View, label: "Clientes", icon: Users },
        { id: "calendar" as View, label: "Calendário", icon: Calendar },
        { id: "reports" as View, label: "Relatórios", icon: FileText },
      ]
    : workspace === "mariana"
    ? [
        { id: "home" as View, label: "Hoje", icon: Home },
        { id: "clients" as View, label: "Tarefas", icon: Users },
        { id: "calendar" as View, label: "Calendário", icon: Calendar },
      ]
    : [
        { id: "notes" as View, label: "Notas", icon: FileText },
      ];

  // reset view when workspace changes if invalid
  useEffect(() => {
    const valid = navItems.some(i => i.id === view);
    if (!valid) setView(navItems[0].id);
  }, [workspace]);

  const renderView = () => {
    if (workspace === "publique") {
      return <NotesView workspace="publique" title="Publique" subtitle="Seu espaço livre. Anote, liste, respira." />;
    }
    if (workspace === "mariana") {
      if (view === "calendar") return <CalendarView workspace="mariana" />;
      if (view === "clients") return <SimpleTasksView workspace="mariana" title="Trabalho com Mariana" subtitle="Tarefas e combinados com a equipe." />;
      return <Dashboard workspace="mariana" />;
    }
    // saficos
    if (view === "clients") return <ClientsView workspace="saficos" />;
    if (view === "calendar") return <CalendarView workspace="saficos" />;
    if (view === "reports") return <ReportsView workspace="saficos" />;
    return <Dashboard workspace="saficos" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-soft flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" />
          </div>
          <div>
            <h1 className="font-display text-lg leading-none">Foco</h1>
            <p className="text-[11px] text-muted-foreground">sua assistente silenciosa</p>
          </div>
        </div>
      </header>

      <main className="container py-6 md:py-10 space-y-6">
        <WorkspaceTabs active={workspace} onChange={setWorkspace} />

        {workspace !== "publique" && (
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
        )}

        <div className="pb-20">{renderView()}</div>
      </main>

      <footer className="container pb-10 text-center text-xs text-muted-foreground">
        Feito com 💛 para mentes que sentem muito.
      </footer>
    </div>
  );
};

export default Index;
