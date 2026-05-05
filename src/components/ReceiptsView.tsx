import { useState } from "react";
import { Workspace } from "@/lib/types";
import { Plus, Trash2, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STORAGE_KEY = "foco.receipts";

function getReceipts(workspace: Workspace): { id: string; label: string; url: string }[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[workspace] || [];
  } catch {
    return [];
  }
}

function saveReceipts(workspace: Workspace, items: { id: string; label: string; url: string }[]) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[workspace] = items;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

function uid() { return Math.random().toString(36).slice(2); }

export function ReceiptsView({ workspace }: { workspace: Workspace }) {
  const [items, setItems] = useState(() => getReceipts(workspace));
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const update = (next: typeof items) => {
    setItems(next);
    saveReceipts(workspace, next);
  };

  const add = () => {
    if (!url.trim()) return;
    update([...items, { id: uid(), label: label.trim() || url.trim(), url: url.trim() }]);
    setLabel("");
    setUrl("");
  };

  const remove = (id: string) => update(items.filter(i => i.id !== id));

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl">Comprovantes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Links e arquivos para inserir nos relatórios.
        </p>
      </div>

      {/* Add new */}
      <div className="soft-card p-4 space-y-3">
        <p className="text-sm font-medium">Adicionar link</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Descrição (ex: Comprovante post 01/05)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={add}
            disabled={!url.trim()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="soft-card p-12 text-center text-muted-foreground text-sm">
          Nenhum comprovante adicionado ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className={cn("soft-card p-4 flex items-center gap-3 gentle-hover")}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{item.url}</p>
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
  );
}
