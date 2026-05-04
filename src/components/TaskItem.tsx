import { Task } from "@/lib/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, todayISO } from "@/lib/cycles";
import { useState } from "react";
import { useFocoData } from "@/hooks/useFocoData";

interface Props {
  task: Task;
  clientName?: string;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  showClient?: boolean;
}

const urgencyConfig = {
  urgent:   { label: "🔴 Urgente",  bg: "bg-red-500/10",    text: "text-red-600 dark:text-red-400"    },
  today:    { label: "🟡 Pra hoje", bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400" },
  whenever: { label: "🟢 Sem pressa", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
} as const;

const urgencyCycle: Array<Task["urgency"]> = ["urgent", "today", "whenever"];

export function TaskItem({ task, clientName, onToggle, showClient }: Props) {
  const [justChecked, setJustChecked] = useState(false);
  const { updateTask } = useFocoData();
  const overdue = task.status !== "done" && task.dueDate && task.dueDate < todayISO();
  const done = task.status === "done";

  const handle = () => {
    if (!done) setJustChecked(true);
    setTimeout(() => setJustChecked(false), 500);
    onToggle(task.id);
  };

  const cycleUrgency = () => {
    const cur = task.urgency ?? "whenever";
    const next = urgencyCycle[(urgencyCycle.indexOf(cur) + 1) % urgencyCycle.length];
    updateTask(task.id, { urgency: next });
  };

  const urgency = task.urgency ?? "whenever";
  const uc = urgencyConfig[urgency];

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
        done
          ? "bg-muted/40 border-transparent"
          : overdue
          ? "bg-card border-warning/40"
          : "bg-card border-border/60 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
      )}
    >
      <button
        onClick={handle}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          done
            ? "bg-success border-success text-success-foreground"
            : "border-muted-foreground/30 hover:border-primary"
        )}
        aria-label={done ? "Desmarcar" : "Marcar como concluída"}
      >
        {done && <Check className={cn("w-3.5 h-3.5", justChecked && "animate-check")} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", done && "line-through text-muted-foreground")}>
          {task.isReport && "📋 "}{task.name}
        </div>
        {(showClient && clientName) || task.dueDate ? (
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            {showClient && clientName && <span>{clientName}</span>}
            {showClient && clientName && task.dueDate && <span>·</span>}
            {task.dueDate && (
              <span className={cn(overdue && "text-warning-foreground font-medium")}>
                {overdue ? "esperando desde " : "para "}{fmtDate(task.dueDate)}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {!done && (
        <button
          onClick={cycleUrgency}
          title="Clique para mudar urgência"
          className={cn(
            "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all",
            uc.bg, uc.text
          )}
        >
          {uc.label}
        </button>
      )}
    </div>
  );
}
