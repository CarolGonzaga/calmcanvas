import { useFocoData } from "@/hooks/useFocoData";
import { TaskItem } from "./TaskItem";
import { fmtDate, ensureCycle, clientProgress, todayISO } from "@/lib/cycles";
import { AlertTriangle, CalendarDays, Clock } from "lucide-react";
import { Workspace } from "@/lib/types";

const greetings = ["Oi ❤️", "Olá!", "Que bom te ver", "Oi, Amor", "Hora de trabalhar, gatinha", "Bora, mulher!", "Ei, gatinha", "Pronta pra brilhar?", "Vamos trabalhar, meu amor", "Ei, amor da minha vida", "Oi, vidinha", "Bora trabalhar", "Oi, linda", "Oi, deusa", "Oi, rainha", "Oi, poderosa", "Oi, maravilhosa"];

export function Dashboard({ workspace }: { workspace: Workspace }) {
  const { clients, tasks, toggleTask } = useFocoData();
  const today = todayISO();

  // 1. URGENTES DO DIA: urgency="urgent" E dueDate = hoje (ou sem data, mas dueDate <= hoje)
  const urgent = tasks.filter(t =>
    t.workspace === workspace &&
    t.status !== "done" &&
    t.urgency === "urgent" &&
    (!t.dueDate || t.dueDate <= today)
  );

  const excludeUrgentIds = new Set(urgent.map(t => t.id));

  // 2. TAREFAS DO DIA: não urgentes, com dueDate = hoje OU marcadas como "today"
  const todayTasks = tasks.filter(t =>
    t.workspace === workspace &&
    t.status !== "done" &&
    !excludeUrgentIds.has(t.id) &&
    (t.dueDate === today || t.urgency === "today")
  );

  const excludeTodayIds = new Set([...excludeUrgentIds, ...todayTasks.map(t => t.id)]);

  // 3. PRÓXIMOS DIAS: dueDate > hoje e <= +7 dias, sem pressa ou sem urgência
  const upcoming = tasks.filter(t => {
    if (
      t.workspace !== workspace ||
      t.status === "done" ||
      excludeTodayIds.has(t.id) ||
      !t.dueDate
    ) return false;
    return t.dueDate > today;
  }).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  const wsClients = clients.filter(c => c.workspace === workspace);

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const date = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const totalPending = urgent.length + todayTasks.length;
  const friendly =
    totalPending === 0
      ? "Tudo em dia por aqui ✨"
      : totalPending <= 3
        ? "Falta pouco, gatinha! ❤️"
        : "Algumas tarefas estão te esperando";

  const clientName = (id?: string) => clients.find(c => c.id === id)?.name;

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="text-sm text-muted-foreground capitalize">{date}</p>
        <h1 className="font-display text-3xl md:text-4xl mt-1">{greeting}</h1>
        <p className="text-muted-foreground mt-2">{friendly}</p>
      </div>

      {/* 🔴 Urgentes do dia */}
      {urgent.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider mb-3 font-semibold flex items-center gap-1.5 text-red-500">
            <AlertTriangle className="w-3.5 h-3.5" /> Urgentes
          </h2>
          <div className="space-y-2">
            {urgent.map(t => (
              <TaskItem key={t.id} task={t} clientName={clientName(t.clientId)} showClient onToggle={toggleTask} />
            ))}
          </div>
        </section>
      )}

      {/* 📅 Tarefas do dia (sem mostrar tags de urgência) */}
      {todayTasks.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider mb-3 font-semibold flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> Tarefas de hoje
          </h2>
          <div className="space-y-2">
            {todayTasks.map(t => (
              <TaskItem key={t.id} task={t} clientName={clientName(t.clientId)} showClient onToggle={toggleTask} hideUrgency />
            ))}
          </div>
        </section>
      )}

      {/* 📆 Próximos dias (sem tags) */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider mb-3 font-semibold flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5" /> Próximos dias
          </h2>
          <div className="space-y-2">
            {upcoming.map(t => (
              <TaskItem key={t.id} task={t} clientName={clientName(t.clientId)} showClient onToggle={toggleTask} hideUrgency />
            ))}
          </div>
        </section>
      )}

      {/* Progresso por projeto */}
      {wsClients.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Progresso por projeto</h2>
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
