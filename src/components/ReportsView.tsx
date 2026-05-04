import { useFocoData } from "@/hooks/useFocoData";
import { ensureCycle, fmtDate, todayISO, daysBetween } from "@/lib/cycles";
import { Workspace } from "@/lib/types";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReportsView({ workspace }: { workspace: Workspace }) {
  const { clients, tasks, toggleTask } = useFocoData();
  const wsClients = clients.filter(c => c.workspace === workspace);
  const today = todayISO();

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
          Um resumo gentil dos relatórios mensais por cliente.
        </p>
      </div>

      {items.length === 0 && (
        <div className="soft-card p-10 text-center text-muted-foreground bg-gradient-soft">
          Sem clientes cadastrados ainda.
        </div>
      )}

      <div className="space-y-3">
        {items.map(({ client, cycle, reportTask, overdue, days }) => {
          if (!reportTask) return null;
          const done = reportTask.status === "done";
          return (
            <div key={client.id} className={cn(
              "soft-card p-5 flex items-center gap-4 gentle-hover",
              overdue && !done && "border-warning/50 bg-accent/30"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                done ? "bg-success/20 text-success" :
                overdue ? "bg-warning/30 text-warning-foreground" : "bg-primary-soft text-primary"
              )}>
                {done ? <Check className="w-5 h-5" strokeWidth={3} /> : <Clock className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{client.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ciclo {cycle.index} · termina em {fmtDate(cycle.end)}
                </p>
                <p className={cn(
                  "text-sm mt-1",
                  done ? "text-success" :
                  overdue ? "text-warning-foreground" : "text-muted-foreground"
                )}>
                  {done
                    ? "Relatório enviado 💛"
                    : overdue
                    ? "Relatório pendente"
                    : days === 0
                    ? "Relatório a enviar hoje"
                    : `Faltam ${days} dia${days === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                onClick={() => toggleTask(reportTask.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  done
                    ? "bg-muted text-muted-foreground hover:bg-muted/70"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-soft)]"
                )}
              >
                {done ? "Desfazer" : "Marcar como enviado"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
