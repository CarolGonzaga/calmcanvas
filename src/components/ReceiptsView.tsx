import { useState } from "react";
import { Workspace } from "@/lib/types";
import { Plus, Trash2, Copy, ExternalLink, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFocoData } from "@/hooks/useFocoData";

const STORAGE_KEY = "foco.receipts";

interface Receipt {
  id: string;
  label: string;
  url: string;
  clientId?: string;
}

function getReceipts(workspace: Workspace): Receipt[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[workspace] || [];
  } catch {
    return [];
  }
}

function saveReceipts(workspace: Workspace, items: Receipt[]) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[workspace] = items;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) { console.error(e); }
}

function uid() { return Math.random().toString(36).slice(2); }

export function ReceiptsView({ workspace }: { workspace: Workspace }) {
  const { clients } = useFocoData();
  const wsClients = clients.filter(c => c.workspace === workspace);
  
  const [items, setItems] = useState(() => getReceipts(workspace));
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const update = (next: Receipt[]) => {
    setItems(next);
    saveReceipts(workspace, next);
  };

  const add = () => {
    if (!url.trim()) return;
    update([...items, { 
      id: uid(), 
      label: label.trim() || url.trim(), 
      url: url.trim(),
      clientId: selectedClientId || undefined 
    }]);
    setLabel("");
    setUrl("");
  };

  const remove = (id: string) => update(items.filter(i => i.id !== id));

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };

  const getClientName = (id?: string) => wsClients.find(c => c.id === id)?.name;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl">Comprovantes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Links e arquivos para inserir nos relatórios. Vincule-os a um projeto para que apareçam automaticamente no relatório mensal.
        </p>
      </div>

      {/* Add new */}
      <div className="soft-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Plus className="w-4 h-4 text-primary" />
          Adicionar novo comprovante
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground ml-1">Descrição</label>
            <input
              type="text"
              placeholder="ex: Comprovante post 01/05"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground ml-1">Vincular a projeto (opcional)</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary transition-colors appearance-none"
            >
              <option value="">Sem vínculo</option>
              {wsClients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground ml-1">URL do Link</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()}
              className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={add}
              disabled={!url.trim()}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40 shadow-sm"
            >
              Adicionar Link
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground ml-1">Seus Links</h2>
        {items.length === 0 ? (
          <div className="soft-card p-12 text-center text-muted-foreground text-sm border-dashed">
            Nenhum comprovante adicionado ainda.
          </div>
        ) : (
          <div className="grid gap-2">
            {items.map(item => (
              <div key={item.id} className={cn("soft-card p-4 flex items-center gap-3 gentle-hover border-border/40 hover:border-primary/30")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.clientId && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase shrink-0">
                        {getClientName(item.clientId)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 opacity-60">{item.url}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copy(item.url)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Abrir link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => remove(item.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
