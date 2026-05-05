import { useEffect, useState } from "react";
import { store, uid } from "@/lib/storage";
import { NoteBlock, Workspace } from "@/lib/types";
import { Plus, Trash2, GripVertical, Check, Search, FileText, ExternalLink, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocoData } from "@/hooks/useFocoData";

export function NotesView({ workspace, title, subtitle }: { workspace: Workspace; title: string; subtitle: string }) {
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => store.getNotes(workspace));

  useEffect(() => { setBlocks(store.getNotes(workspace)); }, [workspace]);
  useEffect(() => { store.setNotes(workspace, blocks); }, [blocks, workspace]);

  const update = (id: string, patch: Partial<NoteBlock>) =>
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  const remove = (id: string) => setBlocks(bs => bs.filter(b => b.id !== id));
  const add = (type: NoteBlock["type"]) =>
    setBlocks(bs => [...bs, {
      id: uid(), type, content: "",
      items: type === "checklist" ? [{ id: uid(), text: "", done: false }] : undefined,
    }]);

  return (
    <div className="space-y-10 animate-fade-up max-w-4xl">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-3xl">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        </div>

        <div className="space-y-2">
          {blocks.map(b => (
            <BlockEditor key={b.id} block={b} onUpdate={(p) => update(b.id, p)} onRemove={() => remove(b.id)} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => add("heading")} className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Título
          </button>
          <button onClick={() => add("text")} className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Texto
          </button>
          <button onClick={() => add("checklist")} className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Checklist
          </button>
        </div>
      </div>

      <div className="pt-10 border-t border-border/60">
        <GlobalProjectNotes workspace={workspace} />
      </div>
    </div>
  );
}

function GlobalProjectNotes({ workspace }: { workspace: Workspace }) {
  const { clients } = useFocoData();
  const [search, setSearch] = useState("");
  const wsClients = clients.filter(c => c.workspace === workspace);

  // Extract all notes from all projects
  const allNotes = wsClients.flatMap(c => {
    try {
      const notesObj = JSON.parse(c.notes || "{}");
      if (Array.isArray(notesObj)) {
        return notesObj.map(s => ({
          projectId: c.id,
          projectName: c.name,
          tabName: s.title || "Geral",
          content: s.content || "",
          tags: s.tags || []
        }));
      }
      return Object.entries(notesObj).map(([tab, content]) => ({
        projectId: c.id,
        projectName: c.name,
        tabName: tab,
        content: String(content),
        tags: []
      }));
    } catch {
      return [{
        projectId: c.id,
        projectName: c.name,
        tabName: "Geral",
        content: c.notes || "",
        tags: []
      }];
    }
  });

  const filtered = allNotes
    .filter(n => {
      // Remove HTML tags to check if there is actual text
      const plain = n.content.replace(/<[^>]*>/g, '').trim();
      return plain.length > 0;
    })
    .filter(n => {
      const q = search.toLowerCase();
      return n.projectName.toLowerCase().includes(q) ||
             n.tabName.toLowerCase().includes(q) ||
             n.content.toLowerCase().includes(q) ||
             n.tags.some(t => t.toLowerCase().includes(q));
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Biblioteca de Projetos</h2>
          <p className="text-muted-foreground text-xs">Busque em todos os seus textos e links salvos.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Pesquisar em tudo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border/60 focus:border-primary focus:outline-none text-sm transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((n, idx) => (
          <div key={idx} className="soft-card p-4 hover:shadow-md transition-all border border-border/40 group flex flex-col h-full bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                   <FileText className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary truncate">{n.projectName}</h4>
                  <p className="text-xs font-semibold truncate text-foreground/80">{n.tabName}</p>
                </div>
              </div>
              <div className="flex gap-1">
                 {n.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">#{t}</span>)}
              </div>
            </div>
            
            <div 
              className="text-xs text-muted-foreground line-clamp-4 flex-1 prose-sm"
              dangerouslySetInnerHTML={{ __html: n.content }}
            />
            
            <div className="mt-4 pt-3 border-t border-border/40 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Hash className="w-3 h-3" /> {n.content.replace(/<[^>]*>/g, '').length} caracteres</span>
               <button className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                 Ver no projeto <ExternalLink className="w-2.5 h-2.5" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed border-border/60">
           <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
           <p className="text-sm text-muted-foreground">Nenhuma nota encontrada para "{search}"</p>
        </div>
      )}
    </div>
  );
}

function BlockEditor({ block, onUpdate, onRemove }: {
  block: NoteBlock;
  onUpdate: (p: Partial<NoteBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group relative flex gap-2 items-start">
      <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 pt-2 transition-opacity">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1">
        {block.type === "heading" && (
          <input
            value={block.content} onChange={e => onUpdate({ content: e.target.value })}
            placeholder="Título…"
            className="w-full font-display text-2xl bg-transparent outline-none py-2"
          />
        )}
        {block.type === "text" && (
          <textarea
            value={block.content} onChange={e => onUpdate({ content: e.target.value })}
            placeholder="Escreva algo…"
            rows={3}
            className="w-full bg-transparent outline-none py-2 resize-none"
          />
        )}
        {block.type === "checklist" && (
          <div className="space-y-1.5 py-2">
            {(block.items ?? []).map((it, idx) => (
              <div key={it.id} className="flex items-center gap-3">
                <button
                  onClick={() => onUpdate({
                    items: block.items!.map(x => x.id === it.id ? { ...x, done: !x.done } : x)
                  })}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0",
                    it.done ? "bg-success border-success text-white" : "border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {it.done && <Check className="w-3 h-3" strokeWidth={3} />}
                </button>
                <input
                  value={it.text}
                  onChange={e => onUpdate({
                    items: block.items!.map(x => x.id === it.id ? { ...x, text: e.target.value } : x)
                  })}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const items = [...block.items!];
                      items.splice(idx + 1, 0, { id: uid(), text: "", done: false });
                      onUpdate({ items });
                    }
                  }}
                  placeholder="Item…"
                  className={cn(
                    "flex-1 bg-transparent outline-none text-sm",
                    it.done && "line-through text-muted-foreground"
                  )}
                />
              </div>
            ))}
            <button
              onClick={() => onUpdate({ items: [...(block.items ?? []), { id: uid(), text: "", done: false }] })}
              className="text-xs text-muted-foreground hover:text-primary mt-1 ml-8"
            >
              + adicionar item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
