import { useState } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { ensureCycle, clientProgress, fmtDate, fmtDateLong, todayISO } from "@/lib/cycles";
import { TaskItem } from "./TaskItem";
import { Plus, Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClientsView({ workspace }: { workspace: Workspace }) {
  const { clients, tasks, addClient, removeClient, toggleTask, addTask, removeTask } = useFocoData();
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
                  <QuickAddTask onAdd={(name) => addTask({ name, clientId: c.id, cycleId: cycle.id, workspace: c.workspace })} />

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

function QuickAddTask({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV(""); } }}
      className="flex items-center gap-2"
    >
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        placeholder="Adicionar tarefa neste ciclo…"
        className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm"
      />
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
  const [tasksText, setTasksText] = useState("Planejamento mensal\nCriação de pauta\nDesign de posts (4)\nLegenda dos posts\nStories semanais\nReels (2)\nAgendamento\nInteração com seguidores\nAnálise de métricas\nReunião de alinhamento");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskTemplate = tasksText.split("\n").map(s => s.trim()).filter(Boolean);
    onSave({ name: name.trim(), startDate, taskTemplate });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
      <form onSubmit={submit} className="bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Novo cliente</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Nome do cliente</span>
          <input
            required value={name} onChange={e => setName(e.target.value)}
            className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
            placeholder="Ex: Marca Florescer"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Início do contrato</span>
          <input
            type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
            className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-muted-foreground mt-1 block">
            O ciclo mensal será gerado a partir desta data.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Tarefas recorrentes do ciclo</span>
          <textarea
            value={tasksText} onChange={e => setTasksText(e.target.value)}
            rows={8}
            className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm font-mono"
          />
          <span className="text-xs text-muted-foreground mt-1 block">
            Uma tarefa por linha. Serão recriadas a cada novo ciclo.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            Criar cliente
          </button>
        </div>
      </form>
    </div>
  );
}
