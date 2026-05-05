import { useState } from "react";
import { Workspace, WorkspaceData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles, Users, BookHeart, Settings, Plus, Trash2, X } from "lucide-react";
import { useFocoData } from "@/hooks/useFocoData";

interface Props {
  active: Workspace;
  onChange: (w: Workspace) => void;
}

const iconsMap: Record<string, any> = {
  BookHeart,
  Users,
  Sparkles,
};

export function WorkspaceTabs({ active, onChange }: Props) {
  const { workspaces } = useFocoData();
  const [showManage, setShowManage] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-2xl relative">
        {workspaces.map(it => {
          const Icon = it.icon ? (iconsMap[it.icon] || Sparkles) : Sparkles;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={cn(
                "flex-1 min-w-[140px] flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left",
                isActive
                  ? "bg-card shadow-[var(--shadow-soft)] text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                isActive ? "bg-primary-soft text-primary" : "bg-background text-muted-foreground"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium">{it.name}</div>
                <div className="text-[11px] opacity-70">{it.sub || "projetos"}</div>
              </div>
            </button>
          );
        })}
        <button
          onClick={() => setShowManage(true)}
          className="flex-shrink-0 w-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-card/50 border border-dashed border-border/50 hover:border-border"
          title="Gerenciar Seções"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showManage && <ManageWorkspacesModal onClose={() => setShowManage(false)} />}
    </>
  );
}

function ManageWorkspacesModal({ onClose }: { onClose: () => void }) {
  const { workspaces, addWorkspace, updateWorkspace, removeWorkspace } = useFocoData();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    addWorkspace({ name: newName.trim(), sub: "projetos", icon: "Sparkles" });
    setNewName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-[var(--shadow-strong)] border border-border/50 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/30">
          <h2 className="font-medium">Gerenciar Seções</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {workspaces.map(w => (
            <div key={w.id} className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={w.name}
                  onChange={(e) => updateWorkspace(w.id, { name: e.target.value })}
                  className="w-full bg-transparent font-medium border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 transition-colors"
                />
                <input
                  type="text"
                  value={w.sub || ""}
                  onChange={(e) => updateWorkspace(w.id, { sub: e.target.value })}
                  placeholder="Subtítulo..."
                  className="w-full text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  if (confirm(`Deseja mesmo remover "${w.name}"?`)) removeWorkspace(w.id);
                }}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="pt-4 border-t border-border/50 mt-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="Nova seção..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleAdd}
              className="bg-primary text-primary-foreground p-2 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
