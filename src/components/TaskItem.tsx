import { Task } from "@/lib/types";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate, todayISO } from "@/lib/cycles";
import { useState, useRef } from "react";
import { useFocoData } from "@/hooks/useFocoData";

interface Props {
  task: Task;
  clientName?: string;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  showClient?: boolean;
  hideUrgency?: boolean;
  onNavigate?: () => void;
}

const urgencyConfig = {
  urgent:   { label: "🔴 Urgente",  bg: "bg-red-500/10",    text: "text-red-600 dark:text-red-400"    },
  today:    { label: "🟡 Normal", bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400" },
  whenever: { label: "🟢 Sem pressa", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
} as const;

const urgencyCycle: Array<Task["urgency"]> = ["urgent", "today", "whenever"];

export function TaskItem({ task, clientName, onToggle, showClient, hideUrgency, onNavigate }: Props) {
  const [justChecked, setJustChecked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
    <>
      <div
        className={cn(
          "group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-300",
          done
            ? "bg-muted/40 border-transparent"
            : overdue
            ? "bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/30 shadow-sm"
            : "bg-card border-border/60 hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
        )}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handle();
          }}
          className={cn(
            "mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            done
              ? "bg-success border-success text-success-foreground"
              : "border-muted-foreground/30 hover:border-primary"
          )}
          aria-label={done ? "Desmarcar" : "Marcar como concluída"}
        >
          {done && <Check className={cn("w-3.5 h-3.5", justChecked && "animate-check")} strokeWidth={3} />}
        </button>

        {/* Content */}
        <div 
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={() => onNavigate ? onNavigate() : setIsEditing(true)}
        >
          <div 
            className={cn("text-sm md:text-base font-medium leading-snug break-words", done && "line-through text-muted-foreground")}
            dangerouslySetInnerHTML={{ __html: task.name }}
          />
          {(showClient && clientName) || task.dueDate ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              {showClient && clientName && <span className="font-medium cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onNavigate?.(); }}>{clientName}</span>}
              {showClient && clientName && task.dueDate && <span>·</span>}
              {task.dueDate && (
                <span className={cn(overdue && "text-red-500 font-semibold uppercase text-[10px] tracking-wider")}>
                  {overdue ? "⚠️ atrasada desde " : "para "}{fmtDate(task.dueDate)}
                </span>
              )}
            </div>
          ) : null}

          {/* Urgency + edit — shown below title on mobile */}
          {!done && !hideUrgency && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cycleUrgency();
                }}
                title="Clique para mudar urgência"
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all shrink-0",
                  uc.bg, uc.text
                )}
              >
                {uc.label}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1.5 rounded-lg transition-colors hover:bg-muted text-muted-foreground opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                title="Editar tarefa"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <EditTaskModal
          task={task}
          onClose={() => setIsEditing(false)}
          onSave={(data) => {
            updateTask(task.id, data);
            setIsEditing(false);
          }}
        />
      )}
    </>
  );
}

function EditTaskModal({ task, onClose, onSave }: {
  task: Task;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
}) {
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [urgency, setUrgency] = useState<Task["urgency"]>(task.urgency || "whenever");
  const editorRef = useRef<HTMLDivElement>(null);

  const urgencyOptions: { value: "urgent" | "today" | "whenever"; label: string }[] = [
    { value: "urgent",   label: "🔴 Urgente"   },
    { value: "today",    label: "🟡 Normal"  },
    { value: "whenever", label: "🟢 Sem pressa" },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">Editar Tarefa</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="block">
            <span className="text-sm font-medium">Nome da tarefa</span>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: task.name }}
              className="mt-1 w-full min-h-[80px] px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm leading-relaxed"
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium">Prazo</span>
            <input
              type="date"
              value={dueDate}
              min={todayISO()}
              onChange={e => setDueDate(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
            />
          </label>

          <div className="block">
            <span className="text-sm font-medium mb-2 block">Urgência</span>
            <div className="flex gap-2">
              {urgencyOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  className={cn(
                    "flex-1 text-xs px-2 py-2 rounded-xl border transition-all text-center",
                    urgency === opt.value
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted">
            Cancelar
          </button>
          <button
            onClick={() => {
              const newName = editorRef.current?.innerHTML || task.name;
              onSave({ name: newName, dueDate: dueDate || undefined, urgency });
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
