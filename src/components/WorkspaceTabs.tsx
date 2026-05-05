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
  const [newSub, setNewSub] = useState("");
  const [newTasks, setNewTasks] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const defaultTaskTemplate = newTasks.trim()
      ? newTasks.split("\n").map(t => t.trim()).filter(Boolean)
      : [];
    addWorkspace({ name: newName.trim(), sub: newSub.trim() || "projetos", icon: "Sparkles", defaultTaskTemplate });
    setNewName("");
    setNewSub("");
    setNewTasks("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-[var(--shadow-strong)] border border-border/50 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/30">
          <h2 className="font-medium">Gerenciar Seções</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2">
          {/* Existing workspaces */}
          {workspaces.map(w => (
            <div key={w.id} className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-2 p-3">
                <div className="flex-1 min-w-0">
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
                  onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                  title="Tarefas recorrentes padrão"
                  className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-1 ${expandedId === w.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tarefas</span>
                </button>
                <button
                  onClick={() => {
                    if (workspaces.length <= 1) { alert("Você precisa ter pelo menos uma seção."); return; }
                    if (confirm(`Deseja mesmo remover "${w.name}"?`)) removeWorkspace(w.id);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded: default task template */}
              {expandedId === w.id && (
                <div className="px-3 pb-3 border-t border-border/40 pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Tarefas recorrentes padrão — uma por linha. Serão pré-carregadas ao criar um novo projeto nesta seção.
                  </p>
                  <textarea
                    rows={5}
                    value={(w.defaultTaskTemplate || []).join("\n")}
                    onChange={(e) => updateWorkspace(w.id, {
                      defaultTaskTemplate: e.target.value.split("\n").map(t => t.trim()).filter(Boolean)
                    })}
                    placeholder={"Post feed\nStories semanais\nReels\nAgendamento"}
                    className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>
          ))}

          {/* New workspace form */}
          <div className="pt-4 border-t border-border/50 mt-2 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nova seção</p>
            <input
              type="text"
              placeholder="Nome da seção..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="text"
              placeholder="Subtítulo (ex: equipe, projetos)..."
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tarefas recorrentes (opcional) — uma por linha:</p>
              <textarea
                rows={4}
                value={newTasks}
                onChange={e => setNewTasks(e.target.value)}
                placeholder={"Post feed\nStories semanais\nReels\nAgendamento"}
                className="w-full bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Criar Seção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
