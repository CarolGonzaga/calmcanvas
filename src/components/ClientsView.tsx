import { useState, useRef, useEffect } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { ensureCycle, clientProgress, fmtDate, fmtDateLong, todayISO } from "@/lib/cycles";
import { TaskItem } from "./TaskItem";
import { Plus, Trash2, ChevronDown, ChevronRight, X, Cloud, CloudOff, Loader2, UploadCloud, FileText, File, Copy, Eraser, Settings, ArrowUp, ArrowDown, NotebookPen, Search, SortAsc, Clock, Archive, Library, Folder, Tag, Edit3, Hash, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { toast } from "sonner";
import { Client } from "@/lib/types";
import { ProjectReceipts } from "./ReceiptsView";

interface ContentSection {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

function parseNotes(notes: string): ContentSection[] {
  if (!notes) return [];
  try {
    const data = JSON.parse(notes);
    if (Array.isArray(data)) return data;
    // Handle old tab format {"Name": "HTML"}
    return Object.entries(data).map(([k, v]) => ({
      id: Math.random().toString(36).slice(2),
      title: k,
      content: String(v),
      tags: []
    }));
  } catch {
    // Handle raw string
    return [{
      id: "legacy",
      title: "Geral",
      content: notes,
      tags: []
    }];
  }
}

export function ClientsView({ workspace, initialOpenId }: { workspace: Workspace; initialOpenId?: string }) {
  const { clients, tasks, addClient, removeClient, toggleTask, addTask, removeTask, updateClient } = useFocoData();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"deadline" | "created">("deadline");
  const [showArchived, setShowArchived] = useState(false);

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
          <h1 className="font-display text-3xl">Tarefas</h1>
        </div>
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

      <div className="flex items-center justify-between gap-4 pt-4">
        <h2 className="font-display text-2xl text-foreground">Meus Projetos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm text-sm font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Novo projeto
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar projetos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border/60 focus:border-primary focus:outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy("deadline")}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
              sortBy === "deadline" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Clock className="w-3.5 h-3.5" /> Vencimento
          </button>
          <button
            onClick={() => setSortBy("created")}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
              sortBy === "created" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Plus className="w-3.5 h-3.5" /> Recentes
          </button>
          
          <div className="w-px h-6 bg-border/40 mx-1 hidden md:block" />
          
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
              showArchived ? "bg-amber-500 text-white border-amber-500" : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
            title={showArchived ? "Ver ativos" : "Ver arquivados"}
          >
            {showArchived ? <Library className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            {showArchived ? "Arquivados" : "Arquivo"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {wsClients
          .filter(c => !!c.isArchived === showArchived)
          .filter(c => {
            const query = search.toLowerCase();
            if (!query) return true;
            
            // Match project name
            if (c.name.toLowerCase().includes(query)) return true;
            
            // Match content sections
            try {
              const sections = parseNotes(c.notes || "[]");
              return sections.some(s => 
                s.title.toLowerCase().includes(query) ||
                s.content.toLowerCase().includes(query) ||
                s.tags.some(t => t.toLowerCase().includes(query))
              );
            } catch { return false; }
          })
          .sort((a, b) => {
            if (sortBy === "deadline") {
              const dateA = ensureCycle(a).end;
              const dateB = ensureCycle(b).end;
              return dateA.localeCompare(dateB);
            } else {
              return b.createdAt.localeCompare(a.createdAt);
            }
          })
          .map(c => {
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

                  <ProjectNotesEditor
                    client={c}
                    onUpdate={(notes) => updateClient(c.id, { notes })}
                  />

                  <ProjectReceipts
                    workspace={workspace}
                    clientId={c.id}
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
                        <Settings className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          updateClient(c.id, { isArchived: !c.isArchived });
                          setOpenId(null);
                        }}
                        className="hover:text-amber-500 transition-colors flex items-center gap-1"
                      >
                        <Archive className="w-3.5 h-3.5" /> {c.isArchived ? "Desarquivar" : "Arquivar"}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remover ${c.name}?`)) removeClient(c.id); }}
                        className="hover:text-destructive transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remover
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


function ProjectNotesEditor({ client, onUpdate }: { client: Client; onUpdate: (notes: string) => void }) {
  const { driveService, appFolderId } = useGoogleDrive();
  const [activeTab, setActiveTab] = useState("Geral");
  const [tabs, setTabs] = useState<Record<string, string>>(() => {
    try {
      const parsed = JSON.parse(client.notes || '{"Geral": ""}');
      if (Array.isArray(parsed)) {
        // Convert from new library format back to tabs
        const res: Record<string, string> = {};
        parsed.forEach((s: any) => res[s.title] = s.content);
        return res;
      }
      return parsed;
    } catch {
      return { "Geral": client.notes || "" };
    }
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [manageTabsOpen, setManageTabsOpen] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (driveService && appFolderId) { loadFiles(); }
  }, [driveService, appFolderId, client.name]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const pId = await driveService!.getProjectFolderId(client.name, appFolderId!);
      const f = await driveService!.listFilesInFolder(pId);
      setFiles(f);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const pId = await driveService!.getProjectFolderId(client.name, appFolderId!);
      await driveService!.uploadFile(file, pId);
      toast.success("Arquivo enviado!");
      loadFiles();
    } catch (e) { toast.error("Erro no upload"); }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateLocal = () => {
    const html = editorRef.current?.innerHTML || "";
    const next = { ...tabs, [activeTab]: html };
    setTabs(next);
  };

  const persist = () => {
    const html = editorRef.current?.innerHTML || "";
    const next = { ...tabs, [activeTab]: html };
    onUpdate(JSON.stringify(next));
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateLocal();
  };

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = tabs[activeTab] || "";
    }
  }, [activeTab, tabs]);

  const handleAddTab = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTabName.trim();
    if (!name || tabs[name]) return;
    const next = { ...tabs, [name]: "" };
    setTabs(next);
    onUpdate(JSON.stringify(next));
    setActiveTab(name);
    setNewTabName("");
    setIsAddingTab(false);
  };

  return (
    <div className="pt-4 mt-4 border-t border-border/40 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Textos e Links
        </h4>
        <button onClick={() => setManageTabsOpen(true)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.keys(tabs).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl border transition-all",
              activeTab === t ? "bg-primary text-white border-primary shadow-sm" : "bg-card border-border/40 text-muted-foreground hover:border-primary/40"
            )}
          >
            {t}
          </button>
        ))}
        {isAddingTab ? (
          <form onSubmit={handleAddTab}>
            <input
              autoFocus
              value={newTabName}
              onChange={e => setNewTabName(e.target.value)}
              placeholder="Nome..."
              className="w-24 px-2 py-1 text-[11px] rounded-lg border border-primary bg-background outline-none"
              onBlur={() => !newTabName.trim() && setIsAddingTab(false)}
            />
          </form>
        ) : (
          <button onClick={() => setIsAddingTab(true)} className="w-7 h-7 flex items-center justify-center rounded-xl border border-dashed border-border/60 text-muted-foreground hover:text-primary hover:border-primary transition-all">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 overflow-hidden bg-background shadow-sm focus-within:border-primary/40 transition-all flex flex-col">
        <div
          ref={editorRef}
          contentEditable
          onBlur={persist}
          onInput={updateLocal}
          onPaste={e => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          className="min-h-[200px] max-h-[500px] overflow-y-auto px-4 py-3 text-sm leading-relaxed focus:outline-none order-1"
        />
        
        <div className="flex flex-col gap-2 p-2 bg-muted/20 border-t border-border/40 order-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Formatting Group */}
            <div className="flex items-center gap-0.5 bg-background/50 p-1 rounded-lg border border-border/40">
              <button onMouseDown={e => e.preventDefault()} onClick={() => exec("bold")} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background text-xs font-bold" title="Negrito">B</button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => exec("italic")} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background text-xs italic font-serif" title="Itálico">I</button>
              <button onMouseDown={e => e.preventDefault()} onClick={() => exec("underline")} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background text-xs underline" title="Sublinhado">U</button>
            </div>

            {/* Case Group */}
            <div className="flex items-center gap-0.5 bg-background/50 p-1 rounded-lg border border-border/40">
              <button 
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  const sel = window.getSelection()?.toString();
                  if (sel) {
                    document.execCommand("insertText", false, sel.toUpperCase());
                    updateLocal();
                  }
                }} 
                className="px-2 h-8 flex items-center justify-center rounded-md hover:bg-background text-[10px] font-bold" title="MAIÚSCULAS"
              >
                AA
              </button>
              <button 
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  const sel = window.getSelection()?.toString();
                  if (sel) {
                    document.execCommand("insertText", false, sel.toLowerCase());
                    updateLocal();
                  }
                }} 
                className="px-2 h-8 flex items-center justify-center rounded-md hover:bg-background text-[10px]" title="minúsculas"
              >
                aa
              </button>
            </div>

            <button onMouseDown={e => e.preventDefault()} onClick={() => exec("removeFormat")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background text-muted-foreground" title="Limpar Formatação"><Eraser className="w-4 h-4" /></button>

            <div className="w-px h-6 bg-border/60 mx-1 hidden sm:block" />

            {/* Colors */}
            <div className="flex items-center gap-1 bg-background/40 p-1 rounded-lg border border-border/20">
              <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1 ml-0.5">Texto</span>
              {NOTE_TEXT_COLORS.map(c => (
                <button key={c.color} onMouseDown={e => e.preventDefault()} onClick={() => exec("foreColor", c.color)} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c.color }} />
              ))}
            </div>

            <div className="flex items-center gap-1 bg-background/40 p-1 rounded-lg border border-border/20">
              <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1 ml-0.5">Fundo</span>
              {NOTE_HIGHLIGHT_COLORS.map(c => (
                <button key={c.color} onMouseDown={e => e.preventDefault()} onClick={() => exec("hiliteColor", c.color)} className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: c.color }} />
              ))}
            </div>

            <div className="flex-1 min-w-[20px]" />

            {/* Final Actions */}
            <div className="flex items-center gap-1">
              <button 
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  if (confirm("Apagar todo o conteúdo desta guia?")) {
                    if (editorRef.current) {
                      editorRef.current.innerHTML = "";
                      persist();
                    }
                  }
                }} 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" 
                title="Apagar tudo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  if (editorRef.current) {
                    navigator.clipboard.writeText(editorRef.current.innerText);
                    toast.success("Conteúdo copiado!");
                  }
                }} 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" 
                title="Copiar tudo"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end px-1 pt-1 border-t border-border/10">
             <span className="text-[9px] text-muted-foreground flex items-center gap-1 whitespace-nowrap uppercase tracking-tighter font-bold">
               <Check className="w-2.5 h-2.5 text-emerald-500" /> Salva ao clicar fora
             </span>
          </div>
        </div>
      </div>

      {manageTabsOpen && (
        <ManageTabsModal
          tabs={tabs}
          onClose={() => setManageTabsOpen(false)}
          onSave={(next) => {
            setTabs(next);
            onUpdate(JSON.stringify(next));
            setManageTabsOpen(false);
            if (!next[activeTab]) setActiveTab(Object.keys(next)[0] || "Geral");
          }}
        />
      )}

      {/* Drive Section - Only if notes not empty */}
      {(tabs[activeTab] || "").replace(/<[^>]*>/g, '').trim().length > 0 && (
        <div className="pt-2 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" /> Arquivos no Drive
          </h4>
          {driveService ? (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando...
                </div>
              ) : (
                files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map(f => (
                      <a key={f.id} href={f.webViewLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-card hover:border-primary/40 transition-all text-[11px] font-medium shadow-sm">
                        {f.iconLink ? <img src={f.iconLink} alt="" className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />}
                        <span className="truncate max-w-[120px]">{f.name}</span>
                      </a>
                    ))}
                  </div>
                )
              )}
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all border border-dashed border-border/60">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                Fazer Upload
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5"><CloudOff className="w-3 h-3" /> Conecte ao Drive para enviar arquivos.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ManageTabsModal({ tabs, onClose, onSave }: { tabs: Record<string, string>; onClose: () => void; onSave: (t: Record<string, string>) => void }) {
  const [list, setList] = useState(Object.keys(tabs).map(k => ({ name: k, content: tabs[k] })));
  
  return (
    <div className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-fade-up">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-xl">Gerenciar Guias</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {list.map((t, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-background border border-border/40 p-2 rounded-xl">
              <input
                value={t.name}
                onChange={e => {
                  const nl = [...list];
                  nl[idx].name = e.target.value;
                  setList(nl);
                }}
                className="flex-1 bg-transparent text-sm font-medium focus:outline-none px-1"
              />
              <button onClick={() => {
                if (list.length > 1 && confirm("Excluir esta guia?")) {
                  setList(list.filter((_, i) => i !== idx));
                }
              }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-muted text-sm">Cancelar</button>
          <button onClick={() => {
            const res: Record<string, string> = {};
            list.forEach(i => { if (i.name.trim()) res[i.name.trim()] = i.content; });
            onSave(res);
          }} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium">Salvar</button>
        </div>
      </div>
    </div>
  );
}

const NOTE_TEXT_COLORS = [
  { color: "#1F2937", label: "Padrão" },
  { color: "#EF4444", label: "Vermelho" },
  { color: "#10B981", label: "Verde" },
  { color: "#3B82F6", label: "Azul" },
  { color: "#8B5CF6", label: "Roxo" },
];

const NOTE_HIGHLIGHT_COLORS = [
  { color: "#FBCFE8", label: "Rosa" },
  { color: "#FEF3C7", label: "Amarelo" },
  { color: "#D1FAE5", label: "Verde" },
  { color: "#DBEAFE", label: "Azul" },
  { color: "#EDE9FE", label: "Roxo" },
];
