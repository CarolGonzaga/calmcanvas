import { useState, useRef, useEffect } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { ensureCycle, clientProgress, fmtDate, fmtDateLong, todayISO } from "@/lib/cycles";
import { TaskItem } from "./TaskItem";
import { Plus, Trash2, ChevronDown, ChevronRight, X, Cloud, CloudOff, Loader2, UploadCloud, FileText, File, Copy, Eraser, Settings, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { toast } from "sonner";
import { Client } from "@/lib/types";

export function ClientsView({ workspace }: { workspace: Workspace }) {
  const { clients, tasks, addClient, removeClient, toggleTask, addTask, removeTask, updateClient } = useFocoData();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const wsClients = clients.filter(c => c.workspace === workspace);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cada projeto tem seu próprio ciclo mensal automático.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[var(--shadow-soft)]"
        >
          <Plus className="w-4 h-4" /> Novo projeto
        </button>
      </div>

      {wsClients.length === 0 && (
        <div className="soft-card p-10 text-center bg-gradient-soft">
          <p className="text-muted-foreground">Nenhum projeto ainda. Que tal começar pelo primeiro?</p>
        </div>
      )}

      <div className="space-y-3">
        {wsClients.map(c => {
          const cycle = ensureCycle(c);
          const p = clientProgress(c.id, cycle.id);
          const cycleTasks = tasks.filter(t => t.cycleId === cycle.id);
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

function QuickAddTask({ onAdd, cycleEnd }: { onAdd: (data: { name: string; dueDate?: string; isReport?: boolean; urgency?: "urgent" | "today" | "whenever" }) => void; cycleEnd: string }) {
  const [v, setV] = useState("");
  const [due, setDue] = useState("");
  const [isReport, setIsReport] = useState(false);
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
        onAdd({ name: v.trim(), dueDate: due || undefined, isReport, urgency });
        setV(""); setDue(""); setIsReport(false); setUrgency("whenever");
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          value={v}
          onChange={e => setV(e.target.value)}
          placeholder="Adicionar tarefa neste ciclo…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm"
        />
        <input
          type="date"
          value={due}
          max={cycleEnd}
          onChange={e => setDue(e.target.value)}
          title="Prazo (opcional)"
          className="px-3 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm"
        />
        <button type="submit" className="px-3 py-2.5 rounded-xl bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-3 pl-1">
        {urgencyOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setUrgency(opt.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              urgency === opt.value
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground select-none cursor-pointer ml-auto">
          <input type="checkbox" checked={isReport} onChange={e => setIsReport(e.target.checked)} />
          📋 relatório
        </label>
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
  const [extras, setExtras] = useState<{ id: string, name: string, qty: number, recurring: boolean, urgency: "urgent" | "today" | "whenever" }[]>(() => {
    const defaults = wsData?.defaultTaskTemplate || [];
    return defaults.map(task => ({
      id: Math.random().toString(),
      name: task,
      qty: 1,
      recurring: true,
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
    setExtras(prev => [...prev, { id: Math.random().toString(), name: "", qty: 1, recurring: true, urgency: "whenever" }]);
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
      if (extra.recurring) {
        for (let i = 0; i < extra.qty; i++) {
          const name = extra.qty > 1 ? `${extra.name.trim()} (${i + 1}/${extra.qty})` : extra.name.trim();
          taskTemplate.push(`${prefix}${name}`);
        }
      } else {
        taskTemplate.push(`[ÚNICA] ${prefix}${extra.name.trim()}`);
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExtraRecurring(extra.id)}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 overflow-hidden ${extra.recurring ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${extra.recurring ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <span className={`text-xs ${extra.recurring ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {extra.recurring ? "Recorrente" : "Única"}
                    </span>
                  </div>

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

          <span className="text-xs text-muted-foreground mt-2 block">
            Tarefas recorrentes são recriadas a cada ciclo. Tarefas únicas aparecem só no primeiro.
          </span>
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


function EditClientModal({ client, onClose, onSave }: { client: any; onClose: () => void; onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void; }) {
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

function ProjectDriveFiles({ client, onUpdate }: { client: Client, onUpdate: (notes: string) => void }) {
  const { driveService, appFolderId } = useGoogleDrive();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tabs, setTabs] = useState<Record<string, string>>({ "Geral": "" });
  const [activeTab, setActiveTab] = useState<string>("Geral");

  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  useEffect(() => {
    if (!client.notes) {
      setTabs({ "Geral": "" });
      return;
    }
    try {
      const parsed = JSON.parse(client.notes);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        setTabs(parsed);
      } else {
        setTabs({ "Geral": client.notes });
      }
    } catch {
      setTabs({ "Geral": client.notes });
    }
  }, [client.notes]);

  useEffect(() => {
    if (!(activeTab in tabs)) {
      const keys = Object.keys(tabs);
      if (keys.length > 0) setActiveTab(keys[0]);
    }
  }, [tabs, activeTab]);

  const [manageTabsOpen, setManageTabsOpen] = useState(false);

  const copyText = () => {
    const text = tabs[activeTab] || "";
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
  };

  const clearText = () => {
    if (!confirm(`Limpar todo o texto da guia '${activeTab}'?`)) return;
    const newTabs = { ...tabs, [activeTab]: "" };
    setTabs(newTabs);
    onUpdate(JSON.stringify(newTabs));
  };

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

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTabs = { ...tabs, [activeTab]: e.target.value };
    setTabs(newTabs);
    onUpdate(JSON.stringify(newTabs));
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

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={copyText}
              title="Copiar texto"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={clearText}
              title="Limpar guia atual"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-border/60 mx-1" />
            <button
              type="button"
              onClick={() => setManageTabsOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              title="Gerenciar guias"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Textarea: increased height and leading-relaxed for spacing */}
        <textarea
          value={tabs[activeTab] || ""}
          onChange={handleNotesChange}
          placeholder={`Anote links, referências e informações em '${activeTab}'...`}
          className="w-full min-h-[300px] leading-relaxed px-4 py-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-primary resize-y"
        />
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
