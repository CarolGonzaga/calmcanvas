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

export function ProjectReceipts({ workspace, clientId }: { workspace: Workspace, clientId: string }) {
  const [items, setItems] = useState(() => getReceipts(workspace));
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const projectItems = items.filter(i => i.clientId === clientId);

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
      clientId 
    }]);
    setLabel("");
    setUrl("");
  };

  const remove = (id: string) => update(items.filter(i => i.id !== id));

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" /> Comprovantes e Links
        </h4>
      </div>
      
      {/* List */}
      <div className="grid gap-2">
        {projectItems.map(item => (
          <div key={item.id} className="bg-background/40 p-3 rounded-xl flex items-center gap-3 border border-border/40 group hover:border-primary/30 transition-all">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.label}</p>
              <p className="text-[10px] text-muted-foreground truncate opacity-60">{item.url}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => copy(item.url)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Copiar"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => remove(item.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {projectItems.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic px-1">Nenhum comprovante vinculado ainda.</p>
        )}
      </div>

      {/* Add form */}
      <div className="flex gap-2 bg-muted/30 p-2 rounded-xl border border-dashed border-border/60">
        <div className="flex-1 space-y-2">
          <input
            type="text"
            placeholder="Descrição (ex: Print Story)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-background border border-border/60 text-xs focus:outline-none focus:border-primary"
          />
          <input
            type="url"
            placeholder="URL do Link"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            className="w-full px-3 py-1.5 rounded-lg bg-background border border-border/60 text-xs focus:outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={add}
          disabled={!url.trim()}
          className="bg-primary-soft text-primary px-3 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-40"
          title="Adicionar"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
