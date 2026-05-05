import { useState } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { fmtDate, parseISO, todayISO } from "@/lib/cycles";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CalendarView({ workspace }: { workspace: Workspace }) {
  const { tasks, clients, cycles } = useFocoData();
  const [ref, setRef] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

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
  const wsCycles = cycles.filter(c => wsClients.some(cl => cl.id === c.clientId));

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

      {/* Mobile: list view only */}
      <div className="md:hidden space-y-2">
        {wsTasks
          .filter(t => {
            const d = parseISO(t.dueDate!);
            return d.getFullYear() === year && d.getMonth() === month;
          })
          .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
          .length === 0 ? (
            <div className="soft-card p-10 text-center text-muted-foreground text-sm">
              Nenhum evento este mês.
            </div>
          ) : (
          wsTasks
            .filter(t => { const d = parseISO(t.dueDate!); return d.getFullYear() === year && d.getMonth() === month; })
            .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
            .map(t => {
              const c = clients.find(c => c.id === t.clientId);
              const iso = t.dueDate!;
              const isToday = iso === today;
              return (
                <div key={t.id} className={cn(
                  "soft-card p-3 flex items-center gap-3 text-sm",
                  isToday && "border-primary/40 bg-primary-soft/30"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-center",
                    isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <span className="text-[10px] leading-none capitalize">
                      {new Date(iso + "T12:00").toLocaleDateString("pt-BR", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-semibold leading-none mt-0.5">
                      {new Date(iso + "T12:00").getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words">{t.isReport ? "📋 " : "✓ "}{t.name}</p>
                    {c && <p className="text-xs text-muted-foreground mt-0.5">{c.name}</p>}
                  </div>
                  {t.urgency === "urgent" && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                </div>
              );
            })
        )}
      </div>

      {/* Desktop: grid calendar */}
      <div className="hidden md:block soft-card p-4">
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
            const isHovered = hoveredDay === iso;
            const { taskEvents, cycleStarts, cycleEnds } = eventsForDate(d);
            const hasReport = taskEvents.some(t => t.isReport);
            const regularTasks = taskEvents.filter(t => !t.isReport);
            const hasTasks = regularTasks.length > 0;
            const hasCycle = cycleStarts.length > 0 || cycleEnds.length > 0;
            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-xl p-1 text-xs flex flex-col transition-colors cursor-default relative group",
                  isToday ? "bg-primary-soft border border-primary/40" : "hover:bg-muted/40"
                )}
                onMouseEnter={() => setHoveredDay(iso)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span className={cn("font-medium leading-none", isToday && "text-primary")}>{d.getDate()}</span>
                
                {/* Task name pills — visible on hover */}
                {(hasTasks || hasReport) && (
                  <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                    {regularTasks.slice(0, 2).map(t => (
                      <span
                        key={t.id}
                        title={t.name}
                        className={cn(
                          "block text-[9px] leading-tight px-1 py-0.5 rounded truncate",
                          t.urgency === "urgent" ? "bg-red-500/15 text-red-600" :
                          t.urgency === "today" ? "bg-yellow-500/15 text-yellow-700" :
                          "bg-primary/10 text-primary"
                        )}
                      >
                        {t.name}
                      </span>
                    ))}
                    {regularTasks.length > 2 && (
                      <span className="text-[9px] text-muted-foreground px-1">+{regularTasks.length - 2}</span>
                    )}
                    {hasReport && (
                      <span className="block text-[9px] leading-tight px-1 py-0.5 rounded truncate bg-warning/15 text-warning-foreground">
                        📋 Relatório
                      </span>
                    )}
                  </div>
                )}

                {/* Dots for cycle markers */}
                {hasCycle && (
                  <div className="mt-auto flex gap-0.5">
                    <span title="Ciclo" className="w-1.5 h-1.5 rounded-full bg-secondary-foreground/60" />
                  </div>
                )}
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

      {/* Upcoming list for the month — desktop only */}
      <div className="hidden md:block">
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
                  <span className="flex-1 break-words">{t.isReport ? "📋 " : "✓ "}{t.name}</span>
                  {c && <span className="text-xs text-muted-foreground shrink-0">{c.name}</span>}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
