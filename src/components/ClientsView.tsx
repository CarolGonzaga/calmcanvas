import { useState, useRef, useEffect } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { ensureCycle, clientProgress, fmtDate, fmtDateLong, todayISO } from "@/lib/cycles";
import { TaskItem } from "./TaskItem";
import { Plus, Trash2, ChevronDown, ChevronRight, X, Cloud, Loader2, UploadCloud, FileText, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { toast } from "sonner";
import { Client } from "@/lib/types";

export function ClientsView({ workspace }: { workspace: Workspace }) {
  const { clients, tasks, addClient, removeClient, toggleTask, addTask, removeTask, updateClient } = useFocoData();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const wsClients = clients.filter(c => c.workspace === workspace);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cada cliente tem seu próprio ciclo mensal automático.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[var(--shadow-soft)]"
        >
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      {wsClients.length === 0 && (
        <div className="soft-card p-10 text-center bg-gradient-soft">
          <p className="text-muted-foreground">Nenhum cliente ainda. Que tal começar pelo primeiro?</p>
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

                  <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Início do contrato: {fmtDateLong(c.startDate)}</span>
                    <button
                      onClick={() => { if (confirm(`Remover ${c.name}?`)) removeClient(c.id); }}
                      className="hover:text-destructive transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover cliente
                    </button>
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
    </div>
  );
}

function QuickAddTask({ onAdd, cycleEnd }: { onAdd: (data: { name: string; dueDate?: string; isReport?: boolean }) => void; cycleEnd: string }) {
  const [v, setV] = useState("");
  const [due, setDue] = useState("");
  const [isReport, setIsReport] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        onAdd({ name: v.trim(), dueDate: due || undefined, isReport });
        setV(""); setDue(""); setIsReport(false);
      }}
      className="flex flex-col sm:flex-row sm:items-center gap-2"
    >
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
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 select-none cursor-pointer">
        <input type="checkbox" checked={isReport} onChange={e => setIsReport(e.target.checked)} />
        📋 relatório
      </label>
      <button type="submit" className="px-3 py-2.5 rounded-xl bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
        <Plus className="w-4 h-4" />
      </button>
    </form>
  );
}

function NewClientModal({ workspace, onClose, onSave }: {
  workspace: Workspace;
  onClose: () => void;
  onSave: (data: { name: string; startDate: string; taskTemplate: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  
  const optionsList = [
    'Lançamento', 'Pré-venda ebook', 'Pré-venda físico', 'Trecho no x', 
    'Story temático', 'Divulgação na comunidade', 'Thread', 'Carrossel', 
    'Reels', 'Stories em vídeo'
  ];

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<{id: string, name: string, qty: number}[]>([]);

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
    setExtras(prev => [...prev, { id: Math.random().toString(), name: "", qty: 1 }]);
  };

  const updateExtraName = (id: string, newName: string) => {
    setExtras(prev => prev.map(e => e.id === id ? { ...e, name: newName } : e));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskTemplate: string[] = [];
    
    optionsList.forEach(opt => {
      const qty = quantities[opt] || 0;
      for (let i = 0; i < qty; i++) {
        taskTemplate.push(qty > 1 ? `${opt} (${i+1}/${qty})` : opt);
      }
    });
    
    extras.forEach(extra => {
      if (extra.name.trim() && extra.qty > 0) {
        for (let i = 0; i < extra.qty; i++) {
          taskTemplate.push(extra.qty > 1 ? `${extra.name.trim()} (${i+1}/${extra.qty})` : extra.name.trim());
        }
      }
    });

    onSave({ name: name.trim(), startDate, taskTemplate });
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

        <div className="block">
          <span className="text-sm font-medium mb-2 block">Itens do Kit (Tarefas recorrentes)</span>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {optionsList.map(opt => (
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
              <div key={extra.id} className="flex items-center justify-between gap-2 bg-muted/30 p-2 rounded-lg">
                <input 
                  value={extra.name} 
                  onChange={e => updateExtraName(extra.id, e.target.value)}
                  placeholder="Nome do extra..."
                  className="flex-1 px-3 py-1 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-primary"
                />
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => updateExtraQty(extra.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-background border hover:bg-muted text-muted-foreground">-</button>
                  <span className="text-sm w-4 text-center">{extra.qty}</span>
                  <button type="button" onClick={() => updateExtraQty(extra.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-background border hover:bg-muted text-muted-foreground">+</button>
                </div>
              </div>
            ))}
          </div>
          
          <button type="button" onClick={addExtra} className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline">
            <Plus className="w-4 h-4" /> Adicionar extra
          </button>
          
          <span className="text-xs text-muted-foreground mt-2 block">
            Os itens selecionados serão recriados a cada novo ciclo do projeto.
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

function ProjectDriveFiles({ client, onUpdate }: { client: Client, onUpdate: (notes: string) => void }) {
  const { driveService, appFolderId } = useGoogleDrive();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState(client.notes || "");
  const [linkInput, setLinkInput] = useState("");

  useEffect(() => {
    setNotes(client.notes || "");
  }, [client.notes]);

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
    setNotes(e.target.value);
    onUpdate(e.target.value);
  };

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    const current = notes ? notes + "\n" : "";
    const updated = current + trimmed;
    setNotes(updated);
    onUpdate(updated);
    setLinkInput("");
  };

  return (
    <div className="pt-4 mt-4 border-t border-border/60 space-y-4">
      {/* Notas e links — sempre visível */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Textos e Links do Projeto
        </h4>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Anote links, referências, briefings e informações importantes..."
          className="w-full h-28 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-primary resize-none"
        />
        <div className="flex gap-2 mt-2">
          <input
            type="url"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addLink()}
            placeholder="Cole um link e pressione Enter ou clique em +"
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addLink}
            className="px-3 py-2 rounded-xl bg-primary-soft text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            +
          </button>
        </div>
      </div>

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
