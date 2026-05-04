import { useState } from "react";
import { useFocoData } from "@/hooks/useFocoData";
import { Workspace } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { Plus } from "lucide-react";
import { todayISO } from "@/lib/cycles";

/** Lightweight task list for workspaces without client/cycle structure (Mariana). */
export function SimpleTasksView({ workspace, title, subtitle }: { workspace: Workspace; title: string; subtitle: string }) {
  const { tasks, addTask, toggleTask, removeTask } = useFocoData();
  const [name, setName] = useState("");
  const [due, setDue] = useState("");

  const wsTasks = tasks.filter(t => t.workspace === workspace);
  const open = wsTasks.filter(t => t.status !== "done");
  const done = wsTasks.filter(t => t.status === "done").slice(-10).reverse();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addTask({ name: name.trim(), workspace, dueDate: due || undefined });
    setName(""); setDue("");
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
      </div>

      <form onSubmit={submit} className="soft-card p-4 flex flex-col sm:flex-row gap-2">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="O que precisa ser feito?"
          className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
        />
        <input
          type="date" value={due} onChange={e => setDue(e.target.value)} min={todayISO()}
          className="px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-sm"
        />
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </form>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Em aberto</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada por aqui ✨</p>
        ) : (
          <div className="space-y-2">
            {open.map(t => (
              <div key={t.id} className="flex gap-2">
                <div className="flex-1"><TaskItem task={t} onToggle={toggleTask} /></div>
                <button onClick={() => removeTask(t.id)} className="text-xs text-muted-foreground hover:text-destructive px-2">remover</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Concluídas recentemente</h2>
          <div className="space-y-2 opacity-80">
            {done.map(t => <TaskItem key={t.id} task={t} onToggle={toggleTask} />)}
          </div>
        </section>
      )}
    </div>
  );
}
