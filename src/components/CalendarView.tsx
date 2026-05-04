import { useState } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { fmtDate, parseISO, todayISO, ensureCycle } from "@/lib/cycles";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CalendarView({ workspace }: { workspace: Workspace }) {
  const { tasks, clients, cycles } = useFocoData();
  const [ref, setRef] = useState(new Date());

  const year = ref.getFullYear();
  const month = ref.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const wsTasks = tasks.filter(t => t.workspace === workspace && t.dueDate);
  const wsClients = clients.filter(c => c.workspace === workspace);
  // cycle boundaries for current view
  const wsCycles = cycles.filter(c => wsClients.some(cl => cl.id === c.clientId));
  // ensure cycles for these clients exist for current view
  wsClients.forEach(c => ensureCycle(c, ref));

  const eventsForDate = (d: Date) => {
    const iso = d.toISOString().slice(0, 10);
    const taskEvents = wsTasks.filter(t => t.dueDate === iso);
    const cycleStarts = wsCycles.filter(c => c.start === iso);
    const cycleEnds = wsCycles.filter(c => c.end === iso);
    return { taskEvents, cycleStarts, cycleEnds };
  };

  const monthName = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const today = todayISO();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Calendário</h1>
          <p className="text-muted-foreground text-sm mt-1">Apenas o essencial.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRef(new Date(year, month - 1, 1))} className="p-2 rounded-xl hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 capitalize font-medium text-sm">{monthName}</span>
          <button onClick={() => setRef(new Date(year, month + 1, 1))} className="p-2 rounded-xl hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="soft-card p-4">
        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
            <div key={d} className="text-center py-2 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const iso = d.toISOString().slice(0, 10);
            const isToday = iso === today;
            const { taskEvents, cycleStarts, cycleEnds } = eventsForDate(d);
            const hasReport = taskEvents.some(t => t.isReport);
            const hasTasks = taskEvents.some(t => !t.isReport);
            const hasCycle = cycleStarts.length > 0 || cycleEnds.length > 0;
            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-xl p-1.5 text-xs flex flex-col gap-1 transition-colors",
                  isToday ? "bg-primary-soft border border-primary/40" : "hover:bg-muted/40"
                )}
              >
                <span className={cn("font-medium", isToday && "text-primary")}>{d.getDate()}</span>
                <div className="flex flex-wrap gap-1 mt-auto">
                  {hasReport && <span title="Relatório" className="w-1.5 h-1.5 rounded-full bg-warning" />}
                  {hasTasks && <span title="Tarefa" className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  {hasCycle && <span title="Ciclo" className="w-1.5 h-1.5 rounded-full bg-secondary-foreground/60" />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> tarefa</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> relatório</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-secondary-foreground/60" /> ciclo</div>
        </div>
      </div>

      {/* Upcoming list for the month */}
      <div>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Eventos deste mês</h2>
        <div className="space-y-2">
          {wsTasks
            .filter(t => {
              const d = parseISO(t.dueDate!);
              return d.getFullYear() === year && d.getMonth() === month;
            })
            .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
            .map(t => {
              const c = clients.find(c => c.id === t.clientId);
              return (
                <div key={t.id} className="soft-card p-3 flex items-center gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{fmtDate(t.dueDate!)}</span>
                  <span className="flex-1">{t.isReport ? "📋 " : "✓ "}{t.name}</span>
                  {c && <span className="text-xs text-muted-foreground">{c.name}</span>}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
