import { useEffect, useState } from "react";
import { store, uid } from "@/lib/storage";
import { NoteBlock, Workspace } from "@/lib/types";
import { Plus, Trash2, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6 animate-fade-up max-w-3xl">
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
        <button onClick={() => add("heading")} className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Título
        </button>
        <button onClick={() => add("text")} className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Texto
        </button>
        <button onClick={() => add("checklist")} className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Checklist
        </button>
      </div>
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
