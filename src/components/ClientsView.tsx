import { useState, useRef, useEffect } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { ensureCycle, clientProgress, fmtDate, fmtDateLong, todayISO } from "@/lib/cycles";
import { TaskItem } from "./TaskItem";
import { Plus, Trash2, ChevronDown, ChevronRight, X, Cloud, CloudOff, Loader2, UploadCloud, FileText, File, Copy, Eraser, Settings, ArrowUp, ArrowDown, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { toast } from "sonner";
import { Client } from "@/lib/types";

export function ClientsView({ workspace, initialOpenId }: { workspace: Workspace; initialOpenId?: string }) {
  const { clients, tasks, addClient, removeClient, toggleTask, addTask, removeTask, updateClient } = useFocoData();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const wsClients = clients.filter(c => c.workspace === workspace);
  
  useEffect(() => {
    if (initialOpenId) {
      setOpenId(initialOpenId);
    }
  }, [initialOpenId]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Projetos</h1>

        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[var(--shadow-soft)]"
        >
          <Plus className="w-4 h-4" /> Novo projeto
        </button>
      </div>

      <div className="space-y-4">
        {/* 📋 Tarefas Livres section */}
        <div className="soft-card p-5 space-y-4 bg-primary/5 border-primary/10">
          <div className="flex items-center gap-2 mb-2 text-primary font-display text-lg">
            <NotebookPen className="w-5 h-5" /> Tarefas Livres
          </div>
          
          <div className="space-y-2">
            {tasks
              .filter(t => !t.clientId && t.workspace === workspace)
              .sort((a, b) => {
                // Same sorting logic as elsewhere
                if (a.dueDate !== b.dueDate) {
                  if (!a.dueDate) return 1;
                  if (!b.dueDate) return -1;
                  return a.dueDate < b.dueDate ? -1 : 1;
                }
                const urgencyScore = { urgent: 0, today: 1, whenever: 2 };
                const sA = urgencyScore[a.urgency || "whenever"];
                const sB = urgencyScore[b.urgency || "whenever"];
                return sA - sB;
              })
              .map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <TaskItem task={t} onToggle={toggleTask} />
                  </div>
                  <button
                    onClick={() => removeTask(t.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remover tarefa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>

          <div className="pt-2 border-t border-primary/10">
            <QuickAddTask
              showRecurring={true}
              onAdd={(data) => addTask({ ...data, workspace })}
            />
          </div>
        </div>

        {wsClients.length === 0 && (
          <div className="soft-card p-10 text-center bg-gradient-soft">
            <p className="text-muted-foreground">Nenhum projeto ainda. Que tal começar pelo primeiro?</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {wsClients.map(c => {
          const cycle = ensureCycle(c);
          const p = clientProgress(c.id, cycle.id);
          const cycleTasks = tasks
            .filter(t => t.cycleId === cycle.id)
            .sort((a, b) => {
              // 1. Sort by Date
              if (a.dueDate !== b.dueDate) {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate < b.dueDate ? -1 : 1;
              }
              // 2. Sort by Urgency if dates are equal
              const urgencyScore = { urgent: 0, today: 1, whenever: 2 };
              const scoreA = urgencyScore[a.urgency as keyof typeof urgencyScore] ?? 2;
              const scoreB = urgencyScore[b.urgency as keyof typeof urgencyScore] ?? 2;
              return scoreA - scoreB;
            });
          const open = openId === c.id;
          return (
            <div key={c.id} className="soft-card overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : c.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
              >
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-medium text-lg">{c.name}</h3>
                    <span className="text-xs text-muted-foreground">Ciclo {cycle.index} · {fmtDate(cycle.start)} → {fmtDate(cycle.end)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-xs">
                      <div className="h-full bg-primary transition-all" style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{p.done}/{p.total}</span>
                  </div>
                </div>
              </button>

              {open && (
                <div className="border-t border-border/60 p-5 space-y-3 bg-muted/20">
                  {cycleTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa neste ciclo.</p>
                  )}
                  {cycleTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <TaskItem task={t} onToggle={toggleTask} />
                      </div>
                      <button
                        onClick={() => removeTask(t.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remover tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <QuickAddTask
                    cycleEnd={cycle.end}
                    onAdd={(data) => addTask({ ...data, clientId: c.id, cycleId: cycle.id, workspace: c.workspace })}
                  />

                  <ProjectDriveFiles
                    client={c}
                    onUpdate={(notes) => updateClient(c.id, { notes })}
                  />

                  <div className="pt-3 mt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>Início do projeto: {fmtDateLong(c.startDate)}</span>
                      {c.endDate && <span>Fim do projeto: {fmtDateLong(c.endDate)}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setEditingClient(c)}
                        className="hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Settings className="w-3.5 h-3.5" /> Editar projeto
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remover ${c.name}?`)) removeClient(c.id); }}
                        className="hover:text-destructive transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remover projeto
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <NewClientModal
          workspace={workspace}
          onClose={() => setShowForm(false)}
          onSave={(data) => { addClient({ ...data, workspace }); setShowForm(false); }}
        />
      )}

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={(data) => {
            updateClient(editingClient.id, data);
            setEditingClient(null);
          }}
        />
      )}
    </div>
  );
}

function QuickAddTask({ onAdd, cycleEnd, showRecurring = false }: { 
  onAdd: (data: { name: string; dueDate?: string; isReport?: boolean; urgency?: "urgent" | "today" | "whenever"; isRecurring?: boolean }) => void; 
  cycleEnd?: string;
  showRecurring?: boolean;
}) {
  const [v, setV] = useState("");
  const [due, setDue] = useState(todayISO());
  const [isReport, setIsReport] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [urgency, setUrgency] = useState<"urgent" | "today" | "whenever">("whenever");

  const urgencyOptions: { value: "urgent" | "today" | "whenever"; label: string }[] = [
    { value: "urgent",   label: "🔴 Urgente"   },
    { value: "today",    label: "🟡 Normal"  },
    { value: "whenever", label: "🟢 Sem pressa" },
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        onAdd({ name: v.trim(), dueDate: due || undefined, isReport, urgency, isRecurring });
        setV(""); setDue(todayISO()); setIsReport(false); setUrgency("whenever"); setIsRecurring(false);
      }}
      className="flex flex-col gap-3"
    >
      <div className="space-y-2">
        <input
          value={v}
          onChange={e => setV(e.target.value)}
          placeholder="Adicionar tarefa…"
          className="w-full px-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm transition-colors"
        />
        <input
          type="date"
          value={due}
          min={todayISO()}
          max={cycleEnd}
          onChange={e => setDue(e.target.value)}
          title="Prazo (opcional)"
          className="w-full px-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm transition-colors"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {urgencyOptions.map(opt => {
          const [emoji, ...labelParts] = opt.label.split(" ");
          const label = labelParts.join(" ");
          const isActive = urgency === opt.value;
          
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setUrgency(opt.value)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all",
                isActive
                  ? "border-primary/30 bg-primary/5 text-primary shadow-sm"
                  : "border-border/40 text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <span className="text-lg mb-0.5 filter drop-shadow-sm">{emoji}</span>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button 
          type="submit" 
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Adicionar</span>
        </button>

        <div className="flex gap-2">
          {showRecurring && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer bg-muted/30 px-3 py-2.5 rounded-xl border border-transparent hover:border-border transition-colors h-[42px]">
              <input 
                type="checkbox" 
                checked={isRecurring} 
                onChange={e => setIsRecurring(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1">🔄 diária</span>
            </label>
          )}

          {!showRecurring && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer bg-muted/30 px-3 py-2.5 rounded-xl border border-transparent hover:border-border transition-colors h-[42px]">
              <input 
                type="checkbox" 
                checked={isReport} 
                onChange={e => setIsReport(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1">📋 relatório</span>
            </label>
          )}
        </div>
      </div>
    </form>
  );
}

function NewClientModal({ workspace, onClose, onSave }: {
  workspace: Workspace;
  onClose: () => void;
  onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void;
}) {
  const { workspaces } = useFocoData();
  const wsData = workspaces.find(w => w.id === workspace);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");

  const optionsList = [
    'Lançamento', 'Pré-venda ebook', 'Pré-venda físico', 'Trecho no x',
    'Story temático', 'Divulgação na comunidade', 'Thread', 'Carrossel',
    'Reels', 'Stories em vídeo'
  ];

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<{ id: string, name: string, qty: number, urgency: "urgent" | "today" | "whenever" }[]>(() => {
    const defaults = wsData?.defaultTaskTemplate || [];
    return defaults.map(task => ({
      id: Math.random().toString(),
      name: task,
      qty: 1,
      urgency: "whenever" as const,
    }));
  });

  const updateQty = (key: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
  };

  const updateExtraQty = (id: string, delta: number) => {
    setExtras(prev => prev.map(e => {
      if (e.id === id) {
        return { ...e, qty: Math.max(0, e.qty + delta) };
      }
      return e;
    }));
  };

  const addExtra = () => {
    setExtras(prev => [...prev, { id: Math.random().toString(), name: "", qty: 1, urgency: "whenever" }]);
  };

  const updateExtraUrgency = (id: string, urgency: "urgent" | "today" | "whenever") => {
    setExtras(prev => prev.map(e => e.id === id ? { ...e, urgency } : e));
  };

  const toggleExtraRecurring = (id: string) => {
    setExtras(prev => prev.map(e => e.id === id ? { ...e, recurring: !e.recurring } : e));
  };

  const updateExtraName = (id: string, newName: string) => {
    setExtras(prev => prev.map(e => e.id === id ? { ...e, name: newName } : e));
  };

  const urgencyOptions: { value: "urgent" | "today" | "whenever"; label: string }[] = [
    { value: "urgent",   label: "🔴" },
    { value: "today",    label: "🟡" },
    { value: "whenever", label: "🟢" },
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const taskTemplate: string[] = [];

    if (workspace === "saficos") {
      optionsList.forEach(opt => {
        const qty = quantities[opt] || 0;
        for (let i = 0; i < qty; i++) {
          taskTemplate.push(qty > 1 ? `${opt} (${i + 1}/${qty})` : opt);
        }
      });
    }

    extras.forEach(extra => {
      if (!extra.name.trim() || extra.qty <= 0) return;
      const prefix = extra.urgency === "urgent" ? "[URGENTE] " : extra.urgency === "today" ? "[HOJE] " : "";
      for (let i = 0; i < extra.qty; i++) {
        const name = extra.qty > 1 ? `${extra.name.trim()} (${i + 1}/${extra.qty})` : extra.name.trim();
        taskTemplate.push(`${prefix}${name}`);
      }
    });

    onSave({ name: name.trim(), startDate, endDate: endDate || undefined, taskTemplate });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
      <form onSubmit={submit} className="bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Novo projeto</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Nome do projeto</span>
          <input
            required value={name} onChange={e => setName(e.target.value)}
            className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
            placeholder="Ex: Lançamento do Livro"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Início do projeto</span>
            <input
              type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
            />
            <span className="text-xs text-muted-foreground mt-1 block">
              O ciclo mensal será gerado a partir desta data.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Fim do projeto <span className="text-muted-foreground font-normal">(Opcional)</span></span>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        <div className="block">
          <span className="text-sm font-medium mb-2 block">
            {workspace === "saficos" ? "Itens do Kit (Tarefas recorrentes)" : "Tarefas recorrentes"}
          </span>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {workspace === "saficos" && optionsList.map(opt => (
              <div key={opt} className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                <span className="text-sm">{opt}</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => updateQty(opt, -1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-background border hover:bg-muted text-muted-foreground">-</button>
                  <span className="text-sm w-4 text-center">{quantities[opt] || 0}</span>
                  <button type="button" onClick={() => updateQty(opt, 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-background border hover:bg-muted text-muted-foreground">+</button>
                </div>
              </div>
            ))}

            {extras.map(extra => (
              <div key={extra.id} className="flex flex-col gap-2 bg-muted/30 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    value={extra.name}
                    onChange={e => updateExtraName(extra.id, e.target.value)}
                    placeholder="Nome da tarefa extra..."
                    className="flex-1 px-3 py-1 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-primary"
                  />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateExtraQty(extra.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-background border hover:bg-muted text-muted-foreground">-</button>
                    <span className="text-sm w-4 text-center">{extra.qty}</span>
                    <button type="button" onClick={() => updateExtraQty(extra.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-background border hover:bg-muted text-muted-foreground">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-1">


                  <div className="flex gap-1">
                    {urgencyOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateExtraUrgency(extra.id, opt.value)}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-lg border transition-all text-[10px]",
                          extra.urgency === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-muted"
                        )}
                        title={opt.value}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addExtra} className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline">
            <Plus className="w-4 h-4" /> Adicionar tarefa extra
          </button>

        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            Criar projeto
          </button>
        </div>
      </form>
    </div>
  );
}


function EditClientModal({ client, onClose, onSave }: { client: Client; onClose: () => void; onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void; }) {
  const [name, setName] = useState(client.name);
  const [startDate, setStartDate] = useState(client.startDate);
  const [endDate, setEndDate] = useState(client.endDate || '');
  const [templateText, setTemplateText] = useState(client.taskTemplate.join('\n'));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskTemplate = templateText.split('\n').map(t => t.trim()).filter(Boolean);
    onSave({ name: name.trim(), startDate, endDate: endDate || undefined, taskTemplate });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
      <form onSubmit={submit} className="bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Editar projeto</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Nome do projeto</span>
          <input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Início do projeto</span>
            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Fim do projeto <span className="text-muted-foreground font-normal">(Opcional)</span></span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Tarefas recorrentes (uma por linha)</span>
          <textarea rows={5} value={templateText} onChange={e => setTemplateText(e.target.value)} className="mt-1 w-full px-4 py-3 leading-relaxed rounded-xl bg-background border border-border focus:border-primary focus:outline-none resize-y text-sm" placeholder="Ex:
[URGENTE] Revisar doc
Reunião com cliente" />
        </label>
        <div className="flex justify-end gap-2 pt-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted">Cancelar</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">Salvar alterações</button>
        </div>
      </form>
    </div>
  );
}

const NOTE_TEXT_COLORS = [
  { color: "#ef4444", label: "Vermelho" },
  { color: "#f97316", label: "Laranja" },
  { color: "#eab308", label: "Amarelo" },
  { color: "#22c55e", label: "Verde" },
  { color: "#3b82f6", label: "Azul" },
  { color: "#8b5cf6", label: "Roxo" },
  { color: "#ec4899", label: "Rosa" },
  { color: "#6b7280", label: "Cinza" },
];
const NOTE_HIGHLIGHT_COLORS = [
  { color: "#fef08a", label: "Amarelo" },
  { color: "#bbf7d0", label: "Verde" },
  { color: "#bfdbfe", label: "Azul" },
  { color: "#f5d0fe", label: "Roxo" },
  { color: "#fed7aa", label: "Laranja" },
  { color: "#fecaca", label: "Vermelho" },
];

function ProjectDriveFiles({ client, onUpdate }: { client: Client, onUpdate: (notes: string) => void }) {
  const { driveService, appFolderId } = useGoogleDrive();
  const [files, setFiles] = useState<Array<{ id: string; name: string; webViewLink?: string; iconLink?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<Record<string, string>>({ "Geral": "" });
  const [activeTab, setActiveTab] = useState<string>("Geral");

  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  useEffect(() => {
    let parsed: Record<string, string> = { "Geral": "" };
    if (client.notes) {
      try {
        const p = JSON.parse(client.notes);
        if (typeof p === "object" && p !== null && !Array.isArray(p)) {
          parsed = p;
        } else {
          parsed = { "Geral": client.notes };
        }
      } catch {
        parsed = { "Geral": client.notes };
      }
    }
    setTabs(parsed);
    // Only update innerHTML if the user is NOT actively typing in the editor
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = parsed[activeTab] || parsed[Object.keys(parsed)[0]] || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.notes]);

  useEffect(() => {
    if (!(activeTab in tabs)) {
      const keys = Object.keys(tabs);
      if (keys.length > 0) setActiveTab(keys[0]);
    }
  }, [tabs, activeTab]);

  const [manageTabsOpen, setManageTabsOpen] = useState(false);

  const copyText = () => {
    const text = editorRef.current?.innerText || "";
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
  };

  const clearText = () => {
    if (!confirm(`Limpar todo o texto da guia '${activeTab}'?`)) return;
    if (editorRef.current) editorRef.current.innerHTML = "";
    const newTabs = { ...tabs, [activeTab]: "" };
    setTabs(newTabs);
    onUpdate(JSON.stringify(newTabs));
  };

  const execNote = (cmd: string, val?: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      toast.info("Selecione um texto primeiro para formatar");
      return;
    }
    
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    
    // Clear the selection after applying formatting so that if the user
    // starts typing immediately, they do so with default formatting.
    // Wait, let's just collapse to the end so they can continue typing.
    sel.collapseToEnd();
    
    // save after formatting
    const html = editorRef.current?.innerHTML || "";
    const newTabs = { ...tabs, [activeTab]: html };
    setTabs(prev => ({ ...prev, [activeTab]: html }));
    onUpdate(JSON.stringify(newTabs));
  };

  const applyCaseNote = (upper: boolean) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    document.execCommand("insertText", false, upper ? sel.toString().toUpperCase() : sel.toString().toLowerCase());
  };

  // Save content from editor WITHOUT causing re-render that resets innerHTML
  const handleNotesInput = () => {
    const html = editorRef.current?.innerHTML || "";
    onUpdate(JSON.stringify({ ...tabs, [activeTab]: html }));
    // Mutate in-place so subsequent onUpdate calls have latest content
    // (avoids stale closure without triggering re-render)
    tabs[activeTab] = html;
  };

  // Paste as plain text only — strips all external formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const plain = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, plain);
  };

  // Sync editor when active tab changes (imperative, no dangerouslySetInnerHTML)
  const isFirstTabSync = useRef(true);
  useEffect(() => {
    if (isFirstTabSync.current) {
      isFirstTabSync.current = false;
      return;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = tabs[activeTab] || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (driveService && appFolderId) {
      loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driveService, appFolderId, client.name]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const pId = await driveService!.getProjectFolderId(client.name, appFolderId!);
      const f = await driveService!.listFilesInFolder(pId);
      setFiles(f);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const pId = await driveService!.getProjectFolderId(client.name, appFolderId!);
      await driveService!.uploadFile(file, pId);
      toast.success("Arquivo enviado com sucesso!");
      loadFiles();
    } catch (e) {
      toast.error("Erro ao enviar arquivo");
      console.error(e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };





  const handleAddTab = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTabName.trim();
    if (!name) return;
    const newTabs = { ...tabs, [name]: "" };
    setTabs(newTabs);
    onUpdate(JSON.stringify(newTabs));
    setActiveTab(name);
    setNewTabName("");
    setIsAddingTab(false);
  };

  return (
    <div className="pt-4 mt-4 border-t border-border/60 space-y-4">
      {/* Notas e links — sempre visível */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Textos e Links do Projeto
        </h4>
        
        {/* Guias/Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setManageTabsOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors shrink-0"
            title="Gerenciar guias"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />

          {Object.keys(tabs).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border",
                activeTab === tab
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-muted text-muted-foreground"
              )}
            >
              {tab}
            </button>
          ))}

          {isAddingTab ? (
            <form onSubmit={handleAddTab} className="flex items-center gap-1">
              <input
                autoFocus
                value={newTabName}
                onChange={e => setNewTabName(e.target.value)}
                placeholder="Nome da guia..."
                className="w-28 px-2 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:border-primary"
                onBlur={() => {
                  if (!newTabName.trim()) setIsAddingTab(false);
                }}
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingTab(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-primary hover:text-primary hover:border-primary transition-colors"
              title="Nova guia"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}


        </div>

        {/* Rich text editor with formatting toolbar */}
        <div className="rounded-xl border border-border focus-within:border-primary transition-colors overflow-hidden bg-background flex flex-col h-[500px] md:h-[350px]">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleNotesInput}
            onPaste={handlePaste}
            data-placeholder={`Anote links, referências e informações em '${activeTab}'...`}
            className="w-full flex-1 overflow-y-auto leading-relaxed px-4 py-3 text-sm focus:outline-none bg-background text-foreground"
          />
          {/* Formatting toolbar - optimized for touch/typing with larger gaps */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 px-3 py-3 md:py-2 bg-muted/50 border-t border-border">
            
            {/* Bold / Italic / Underline */}
            <div className="flex items-center gap-1">
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execNote("bold")} title="Negrito"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background hover:shadow-sm transition-all text-foreground/70 hover:text-foreground">
                <span className="font-bold text-sm">B</span>
              </button>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execNote("italic")} title="Itálico"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background hover:shadow-sm transition-all text-foreground/70 hover:text-foreground">
                <span className="italic text-sm">I</span>
              </button>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execNote("underline")} title="Sublinhado"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background hover:shadow-sm transition-all text-foreground/70 hover:text-foreground">
                <span className="underline text-sm">U</span>
              </button>
            </div>

            <span className="w-px h-5 bg-border shrink-0 hidden sm:block" />

            {/* UPPER / lower */}
            <div className="flex items-center gap-1">
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyCaseNote(true)} title="TUDO MAIÚSCULO"
                className="h-8 px-2.5 flex items-center justify-center rounded-lg hover:bg-background hover:shadow-sm transition-all text-foreground/70 hover:text-foreground text-[11px] font-semibold">
                AA
              </button>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyCaseNote(false)} title="tudo minúsculo"
                className="h-8 px-2.5 flex items-center justify-center rounded-lg hover:bg-background hover:shadow-sm transition-all text-foreground/70 hover:text-foreground text-[11px] font-semibold lowercase">
                aa
              </button>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execNote("removeFormat")} title="Remover formatação"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <span className="w-px h-5 bg-border shrink-0 hidden sm:block" />

            {/* Colors */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">Cor</span>
              <div className="flex items-center gap-1.5">
                {NOTE_TEXT_COLORS.map(({ color, label }) => (
                  <button key={color} type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => execNote("foreColor", color)}
                    title={`Texto: ${label}`}
                    className="w-6 h-6 rounded-full border-2 border-background hover:scale-110 transition-transform shrink-0 shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <span className="w-px h-5 bg-border shrink-0 hidden md:block" />

            {/* Highlights */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider shrink-0">Fundo</span>
              <div className="flex items-center gap-1.5">
                {NOTE_HIGHLIGHT_COLORS.map(({ color, label }) => (
                  <button key={color} type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => execNote("hiliteColor", color)}
                    title={`Grifar: ${label}`}
                    className="w-6 h-6 rounded-full border-2 border-background hover:scale-110 transition-transform shrink-0 shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="hidden md:block flex-1" />



            <span className="w-px h-5 bg-border shrink-0" />

            {/* Copy and Clear */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={copyText}
                title="Copiar texto"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={clearText}
                title="Limpar guia atual"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {manageTabsOpen && (
        <ManageTabsModal
          tabs={tabs}
          onClose={() => setManageTabsOpen(false)}
          onSave={(newTabs) => {
            setTabs(newTabs);
            onUpdate(JSON.stringify(newTabs));
            setManageTabsOpen(false);
            if (!(activeTab in newTabs)) {
              setActiveTab(Object.keys(newTabs)[0]);
            }
          }}
        />
      )}

      {/* Arquivos do Drive — só aparece se conectado */}
      {driveService ? (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" /> Arquivos no Drive
          </h4>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando arquivos...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {files.map(f => (
                  <a
                    key={f.id}
                    href={f.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs"
                  >
                    {f.iconLink ? <img src={f.iconLink} alt="" className="w-4 h-4" /> : <File className="w-4 h-4" />}
                    <span className="truncate max-w-[150px]">{f.name}</span>
                  </a>
                ))}
                {files.length === 0 && <span className="text-xs text-muted-foreground">Nenhum arquivo enviado ainda.</span>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-soft text-primary hover:bg-primary/20 transition-colors"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  {uploading ? "Enviando..." : "Upload Arquivo"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CloudOff className="w-3.5 h-3.5" />
          Conecte ao Google Drive para enviar arquivos.
        </p>
      )}
    </div>
  );
}

function ManageTabsModal({ tabs, onClose, onSave }: {
  tabs: Record<string, string>;
  onClose: () => void;
  onSave: (newTabs: Record<string, string>) => void;
}) {
  const [tabList, setTabList] = useState(
    Object.keys(tabs).map(k => ({ id: Math.random().toString(), name: k, content: tabs[k] }))
  );

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const nl = [...tabList];
    [nl[idx - 1], nl[idx]] = [nl[idx], nl[idx - 1]];
    setTabList(nl);
  };

  const moveDown = (idx: number) => {
    if (idx === tabList.length - 1) return;
    const nl = [...tabList];
    [nl[idx], nl[idx + 1]] = [nl[idx + 1], nl[idx]];
    setTabList(nl);
  };

  const removeTab = (idx: number) => {
    if (tabList.length === 1) {
      toast.error("Você precisa ter pelo menos uma guia.");
      return;
    }
    if (confirm(`Excluir a guia '${tabList[idx].name}' e todo seu conteúdo?`)) {
      setTabList(tabList.filter((_, i) => i !== idx));
    }
  };

  const updateName = (idx: number, newName: string) => {
    const nl = [...tabList];
    nl[idx].name = newName;
    setTabList(nl);
  };

  const handleSave = () => {
    const names = tabList.map(t => t.name.trim()).filter(Boolean);
    if (new Set(names).size !== names.length) {
      toast.error("Nomes de guias não podem ser duplicados ou vazios.");
      return;
    }
    if (names.length !== tabList.length) {
      toast.error("Nomes não podem ser vazios.");
      return;
    }
    
    const newTabs: Record<string, string> = {};
    for (const t of tabList) {
      newTabs[t.name.trim()] = t.content;
    }
    onSave(newTabs);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl">Gerenciar Guias</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {tabList.map((t, idx) => (
            <div key={t.id} className="flex items-center gap-2 bg-background border border-border p-2 rounded-xl">
              <input
                value={t.name}
                onChange={e => updateName(idx, e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium focus:outline-none px-1"
              />
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveUp(idx)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => moveDown(idx)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => removeTab(idx)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 mt-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted text-sm">Cancelar</button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">Salvar</button>
        </div>
      </div>
    </div>
  );
}
