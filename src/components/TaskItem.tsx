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
            ? "bg-card border-warning/40"
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
        <div className="flex-1 min-w-0" onClick={onNavigate} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
          <div 
            className={cn("text-sm md:text-base font-medium leading-snug break-words", done && "line-through text-muted-foreground")}
            dangerouslySetInnerHTML={{ __html: task.name }}
          />
          {(showClient && clientName) || task.dueDate ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
              {showClient && clientName && <span className="font-medium cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onNavigate?.(); }}>{clientName}</span>}
              {showClient && clientName && task.dueDate && <span>·</span>}
              {task.dueDate && (
                <span className={cn(overdue && "text-warning-foreground font-medium")}>
                  {overdue ? "esperando desde " : "para "}{fmtDate(task.dueDate)}
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

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const applyCase = (upper: boolean) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    document.execCommand("insertText", false, upper ? text.toUpperCase() : text.toLowerCase());
  };

  const TEXT_COLORS = [
    { color: "#ef4444", label: "Vermelho" },
    { color: "#f97316", label: "Laranja" },
    { color: "#eab308", label: "Amarelo" },
    { color: "#22c55e", label: "Verde" },
    { color: "#3b82f6", label: "Azul" },
    { color: "#8b5cf6", label: "Roxo" },
    { color: "#ec4899", label: "Rosa" },
    { color: "#6b7280", label: "Cinza" },
  ];

  const HIGHLIGHT_COLORS = [
    { color: "#fef08a", label: "Amarelo" },
    { color: "#bbf7d0", label: "Verde" },
    { color: "#bfdbfe", label: "Azul" },
    { color: "#f5d0fe", label: "Roxo" },
    { color: "#fed7aa", label: "Laranja" },
    { color: "#fecaca", label: "Vermelho" },
  ];

  const prevent = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-fade-up relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">Editar Tarefa</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="block">
            <span className="text-sm font-medium">Nome da tarefa</span>
            <div className="mt-1 rounded-xl border border-border focus-within:border-primary overflow-hidden transition-colors">
              <div
                ref={editorRef}
                contentEditable
                dangerouslySetInnerHTML={{ __html: task.name }}
                className="w-full min-h-[80px] px-4 pt-3 pb-2 bg-background focus:outline-none text-sm leading-relaxed"
              />

              <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-muted/50 border-t border-border">
                <button type="button" onMouseDown={prevent} onClick={() => exec("bold")} title="Negrito"
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground">
                  <span className="font-bold text-xs">B</span>
                </button>
                <button type="button" onMouseDown={prevent} onClick={() => exec("italic")} title="Itálico"
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground">
                  <span className="italic text-xs">I</span>
                </button>
                <button type="button" onMouseDown={prevent} onClick={() => exec("underline")} title="Sublinhado"
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground">
                  <span className="underline text-xs">U</span>
                </button>

                <span className="w-px h-4 bg-border mx-0.5 shrink-0" />

                <button type="button" onMouseDown={prevent} onClick={() => applyCase(true)} title="TUDO MAIÚSCULO"
                  className="h-7 px-2 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground text-[10px] font-semibold tracking-wide">
                  AA
                </button>
                <button type="button" onMouseDown={prevent} onClick={() => applyCase(false)} title="tudo minúsculo"
                  className="h-7 px-2 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-foreground/70 hover:text-foreground text-[10px] font-semibold tracking-wide lowercase">
                  aa
                </button>

                <span className="w-px h-4 bg-border mx-0.5 shrink-0" />

                <span className="text-[9px] text-muted-foreground font-medium px-1 shrink-0 leading-none">Cor</span>
                {TEXT_COLORS.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={prevent}
                    onClick={() => exec("foreColor", color)}
                    title={`Cor do texto: ${label}`}
                    className="w-5 h-5 rounded-full border-2 border-background hover:scale-125 transition-transform shrink-0 shadow-sm ring-1 ring-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}

                <span className="w-px h-4 bg-border mx-0.5 shrink-0" />

                <span className="text-[9px] text-muted-foreground font-medium px-1 shrink-0 leading-none">Fundo</span>
                {HIGHLIGHT_COLORS.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={prevent}
                    onClick={() => exec("hiliteColor", color)}
                    title={`Grifar: ${label}`}
                    className="w-5 h-5 rounded-full border-2 border-background hover:scale-125 transition-transform shrink-0 shadow-sm ring-1 ring-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}

                <span className="w-px h-4 bg-border mx-0.5 shrink-0" />

                <button type="button" onMouseDown={prevent} onClick={() => exec("removeFormat")} title="Remover formatação"
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Prazo</span>
            <input
              type="date"
              value={dueDate}
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
