import { useState } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { ensureCycle, fmtDate, todayISO, daysBetween } from "@/lib/cycles";
import { Workspace, Client, Cycle } from "@/lib/types";
import { Check, Clock, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportModal } from "./ReportModal";

export function ReportsView({ workspace }: { workspace: Workspace }) {
  const { clients, tasks, toggleTask, workspaces } = useFocoData();
  const wsClients = clients.filter(c => c.workspace === workspace);
  const wsData = workspaces.find(w => w.id === workspace);
  const today = todayISO();

  const [modal, setModal] = useState<{ client: Client; cycle: Cycle } | null>(null);

  const items = wsClients.map(c => {
    const cycle = ensureCycle(c);
    const reportTask = tasks.find(t => t.cycleId === cycle.id && t.isReport);
    const overdue = reportTask?.dueDate && reportTask.dueDate < today && reportTask.status !== "done";
    const days = reportTask?.dueDate ? daysBetween(today, reportTask.dueDate) : null;
    return { client: c, cycle, reportTask, overdue, days };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Um resumo gentil dos relatórios mensais por projeto.
        </p>
      </div>

      {clients.length === 0 && (
        <div className="soft-card p-12 text-center text-muted-foreground bg-gradient-soft">
          Sem projetos cadastrados ainda.
        </div>
      )}

      <div className="space-y-3">
        {items.map(({ client, cycle, reportTask, overdue, days }) => {
          if (!reportTask) return null;
          const done = reportTask.status === "done";
          return (
            <div key={client.id} className={cn(
              "soft-card p-4 md:p-5 gentle-hover",
              overdue && !done && "border-warning/50 bg-accent/30"
            )}>
              {/* Main row */}
              <div className="flex items-start gap-3 md:gap-4">
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  done ? "bg-success/20 text-success" :
                  overdue ? "bg-warning/30 text-warning-foreground" : "bg-primary-soft text-primary"
                )}>
                  {done ? <Check className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} /> : <Clock className="w-4 h-4 md:w-5 md:h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm md:text-base">{client.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ciclo {cycle.index} · termina em {fmtDate(cycle.end)}
                  </p>
                  <p className={cn(
                    "text-sm mt-1",
                    done ? "text-success" :
                    overdue ? "text-warning-foreground" : "text-muted-foreground"
                  )}>
                    {done ? "Relatório enviado 💛" : overdue ? "Relatório pendente" : days === 0 ? "Relatório a enviar hoje" : `Faltam ${days} dia${days === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>
              {/* Action buttons — always below on mobile */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/40">
                <button
                  onClick={() => setModal({ client, cycle })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-1 justify-center sm:flex-none sm:justify-start"
                >
                  <FileDown className="w-3.5 h-3.5 shrink-0" /> Gerar Relatório
                </button>
                <button
                  onClick={() => toggleTask(reportTask.id)}
                  className={cn(
                    "flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all text-center",
                    done
                      ? "bg-muted text-muted-foreground hover:bg-muted/70"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-soft)]"
                  )}
                >
                  {done ? "Desfazer" : "Marcar enviado"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report modal */}
      {modal && wsData && (
        <ReportModal
          client={modal.client}
          cycle={modal.cycle}
          workspace={wsData}
          tasks={tasks}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
