import { useFocoData } from "@/hooks/useFocoData";
import { TaskItem } from "./TaskItem";
import { getOverdueTasks, getTodayTasks, getUpcomingDeadlines, fmtDate, ensureCycle, clientProgress } from "@/lib/cycles";
import { Sparkles } from "lucide-react";
import { Workspace } from "@/lib/types";

const greetings = ["Oi ❤️", "Olá!", "Que bom te ver", "Oi, Amor", "Hora de trabalhar, gatinha", "Bora", "Ei, gatinha", "Pronta pra brilhar?", "Vamos trabalhar, meu amor", "Ei, amor da minha vida", "Oi, vidinha", "Bora trabalhar", "Oi, linda", "Oi, deusa", "Oi, rainha", "Oi, poderosa", "Oi, maravilhosa"];

export function Dashboard({ workspace }: { workspace: Workspace }) {
  const { clients, tasks, toggleTask } = useFocoData();

  const filterWs = (t: any) => t.workspace === workspace;
  const today = getTodayTasks().filter(filterWs);
  const overdue = getOverdueTasks().filter(filterWs);
  const upcoming = getUpcomingDeadlines(7).filter(filterWs);

  const wsClients = clients.filter(c => c.workspace === workspace);
  const wsTasks = tasks.filter(t => t.workspace === workspace && t.status !== "done" && !t.dueDate);

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const date = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const totalPending = today.length + overdue.length + wsTasks.length;
  const friendly =
    totalPending === 0
      ? "Tudo em dia por aqui ✨"
      : totalPending <= 3
        ? "Falta pouco 💛"
        : "Algumas tarefas estão te esperando";

  const clientName = (id?: string) => clients.find(c => c.id === id)?.name;

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{date}</p>
        <h1 className="font-display text-3xl md:text-4xl mt-1">{greeting}</h1>
        <p className="text-muted-foreground mt-2">{friendly}</p>
      </div>

      {/* Today */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Para hoje</h2>
        {today.length === 0 ? (
          <div className="soft-card p-6 text-center text-muted-foreground bg-gradient-soft">
            <Sparkles className="w-5 h-5 mx-auto mb-2 text-primary" />
            Nada urgente para hoje. Respira fundo.
          </div>
        ) : (
          <div className="space-y-2">
            {today.map(t => (
              <TaskItem key={t.id} task={t} clientName={clientName(t.clientId)} showClient onToggle={toggleTask} />
            ))}
          </div>
        )}
      </section>

      {/* Overdue */}
      {overdue.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Esperando por você</h2>
          <div className="space-y-2">
            {overdue.map(t => (
              <TaskItem key={t.id} task={t} clientName={clientName(t.clientId)} showClient onToggle={toggleTask} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Nos próximos dias</h2>
          <div className="space-y-2">
            {upcoming.map(t => (
              <TaskItem key={t.id} task={t} clientName={clientName(t.clientId)} showClient onToggle={toggleTask} />
            ))}
          </div>
        </section>
      )}

      {/* Client progress */}
      {wsClients.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Progresso por cliente</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {wsClients.map(c => {
              const cycle = ensureCycle(c);
              const p = clientProgress(c.id, cycle.id);
              return (
                <div key={c.id} className="soft-card p-4 gentle-hover">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium">{c.name}</h3>
                    <span className="text-xs text-muted-foreground">ciclo {cycle.index}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtDate(cycle.start)} → {fmtDate(cycle.end)}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {p.done} de {p.total} tarefas concluídas
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
