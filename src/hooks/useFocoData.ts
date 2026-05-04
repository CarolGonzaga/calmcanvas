import { useEffect, useState, useCallback } from "react";
import { store, uid } from "@/lib/storage";
import { Client, Task, Workspace } from "@/lib/types";
import { ensureCycle, syncAllCycles } from "@/lib/cycles";

let listeners: Array<() => void> = [];
function emit() { listeners.forEach(l => l()); }

export function useFocoData() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick(t => t + 1);
    listeners.push(l);
    return () => { listeners = listeners.filter(x => x !== l); };
  }, []);

  const clients = store.getClients();
  const tasks = store.getTasks();
  const cycles = store.getCycles();

  const refresh = useCallback(() => emit(), []);

  const addClient = (data: Omit<Client, "id" | "createdAt" | "workspace"> & { workspace?: Workspace }) => {
    const c: Client = {
      ...data,
      id: uid(),
      workspace: data.workspace ?? "saficos",
      createdAt: new Date().toISOString(),
    };
    store.setClients([...store.getClients(), c]);
    ensureCycle(c);
    emit();
    return c;
  };

  const updateClient = (id: string, patch: Partial<Client>) => {
    store.setClients(store.getClients().map(c => c.id === id ? { ...c, ...patch } : c));
    emit();
  };

  const removeClient = (id: string) => {
    store.setClients(store.getClients().filter(c => c.id !== id));
    store.setTasks(store.getTasks().filter(t => t.clientId !== id));
    store.setCycles(store.getCycles().filter(c => c.clientId !== id));
    emit();
  };

  const addTask = (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: Task["status"] }) => {
    const task: Task = {
      ...t,
      id: uid(),
      status: t.status ?? "todo",
      createdAt: new Date().toISOString(),
    };
    store.setTasks([...store.getTasks(), task]);
    emit();
    return task;
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    store.setTasks(store.getTasks().map(t => t.id === id ? { ...t, ...patch } : t));
    emit();
  };

  const removeTask = (id: string) => {
    store.setTasks(store.getTasks().filter(t => t.id !== id));
    emit();
  };

  const toggleTask = (id: string) => {
    store.setTasks(store.getTasks().map(t => {
      if (t.id !== id) return t;
      const next = t.status === "done" ? "todo" : "done";
      return { ...t, status: next, completedAt: next === "done" ? new Date().toISOString() : undefined };
    }));
    emit();
  };

  return {
    clients, tasks, cycles,
    addClient, updateClient, removeClient,
    addTask, updateTask, removeTask, toggleTask,
    refresh, syncAllCycles: () => { syncAllCycles(); emit(); },
  };
}
