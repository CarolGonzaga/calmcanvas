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

                  <ProjectContentLibrary
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


// Migration helper and interfaces moved to top of file

function ProjectContentLibrary({ client, onUpdate }: { client: Client; onUpdate: (notes: string) => void }) {
  const { driveService, appFolderId } = useGoogleDrive();
  const [sections, setSections] = useState(() => parseNotes(client.notes || ""));
  const [localSearch, setLocalSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = (next: ContentSection[]) => {
    setSections(next);
    onUpdate(JSON.stringify(next));
  };

  const addSection = () => {
    const next = [
      { id: Math.random().toString(36).slice(2), title: "Nova Seção", content: "", tags: [] },
      ...sections
    ];
    save(next);
    setEditingId(next[0].id);
  };

  const updateSection = (id: string, patch: Partial<ContentSection>) => {
    save(sections.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const removeSection = (id: string) => {
    if (confirm("Excluir esta seção permanentemente?")) {
      save(sections.filter(s => s.id !== id));
    }
  };

  const filtered = sections.filter(s => 
    s.title.toLowerCase().includes(localSearch.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(localSearch.toLowerCase())) ||
    s.content.toLowerCase().includes(localSearch.toLowerCase())
  );

  useEffect(() => {
    if (driveService && appFolderId) {
      loadFiles();
    }
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

  return (
    <div className="space-y-4 py-2 border-t border-border/40 mt-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Folder className="w-4 h-4 text-primary" /> Textos e Links do Projeto
        </h4>
        <button
          onClick={addSection}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary-soft text-primary hover:bg-primary hover:text-white transition-all text-[11px] font-bold uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Seção
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          placeholder="Filtrar nesta biblioteca..."
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border/40 text-xs focus:outline-none focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(s => {
          const isEditing = editingId === s.id;
          return (
            <div key={s.id} className={cn(
              "rounded-2xl border transition-all overflow-hidden",
              isEditing ? "border-primary bg-card shadow-md ring-1 ring-primary/10" : "border-border/40 bg-muted/10 hover:border-primary/20"
            )}>
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-muted/20">
                {isEditing ? (
                  <input
                    value={s.title}
                    onChange={e => updateSection(s.id, { title: e.target.value })}
                    className="flex-1 bg-transparent font-medium text-sm focus:outline-none border-b border-primary/30 mr-4"
                    autoFocus
                  />
                ) : (
                  <div className="flex-1 min-w-0" onClick={() => setEditingId(s.id)}>
                    <h5 className="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors">{s.title || "Sem título"}</h5>
                    <div className="flex gap-1 mt-1">
                      {s.tags.map((t, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">#{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingId(isEditing ? null : s.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                    {isEditing ? <Check className="w-4 h-4 text-primary" /> : <Edit3 className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => removeSection(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Content / Editor */}
              {isEditing && (
                <div className="p-3 space-y-3 animate-fade-down">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Conteúdo</span>
                    <ContentEditor
                      initialValue={s.content}
                      onChange={c => updateSection(s.id, { content: c })}
                      placeholder="Anote aqui..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Rótulos / Tags (separados por vírgula)</span>
                    <input
                      value={s.tags.join(", ")}
                      onChange={e => updateSection(s.id, { tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                      placeholder="ex: legendas, links, referências"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/40 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center py-6 text-xs text-muted-foreground italic">Nenhuma seção encontrada.</p>
        )}
      </div>

      {/* Drive Section */}
      <div className="pt-4 border-t border-border/40 space-y-3">
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
              <div className="flex flex-wrap gap-2">
                {files.map(f => (
                  <a key={f.id} href={f.webViewLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-card hover:border-primary/40 transition-all text-[11px] font-medium shadow-sm">
                    {f.iconLink ? <img src={f.iconLink} alt="" className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />}
                    <span className="truncate max-w-[120px]">{f.name}</span>
                  </a>
                ))}
                {files.length === 0 && <span className="text-[10px] text-muted-foreground">Vazio.</span>}
              </div>
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
    </div>
  );
}

function ContentEditor({ initialValue, onChange, placeholder }: { initialValue: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current && ref.current) {
      ref.current.innerHTML = initialValue;
      isFirst.current = false;
    }
  }, [initialValue]);

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
      <div className="flex items-center gap-1 p-1 bg-muted/10 border-b border-border/40 overflow-x-auto scrollbar-none">
        <button type="button" onClick={() => document.execCommand("bold")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-xs font-bold">B</button>
        <button type="button" onClick={() => document.execCommand("italic")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-xs italic">I</button>
        <button type="button" onClick={() => {
           const url = prompt("Link:");
           if (url) document.execCommand("createLink", false, url);
        }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"><Hash className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => document.execCommand("removeFormat")} className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"><Eraser className="w-3.5 h-3.5" /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML || "")}
        data-placeholder={placeholder}
        className="min-h-[120px] max-h-[300px] overflow-y-auto px-3 py-2 text-xs leading-relaxed focus:outline-none"
      />
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
  { color: "transparent", label: "Nenhum" },
  { color: "#FEF3C7", label: "Amarelo" },
  { color: "#D1FAE5", label: "Verde" },
  { color: "#DBEAFE", label: "Azul" },
  { color: "#EDE9FE", label: "Roxo" },
];
