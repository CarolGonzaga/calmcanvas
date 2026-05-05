import { useEffect, useState, useCallback } from "react";
import { store, uid } from "@/lib/storage";
import { Client, Task, Workspace } from "@/lib/types";
import { ensureCycle, syncAllCycles } from "@/lib/cycles";
import { emit, subscribeToFocoData } from "@/lib/events";
import { useGoogleDrive } from "./useGoogleDrive";

export function useFocoData() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return subscribeToFocoData(() => setTick(t => t + 1));
  }, []);

  const workspaces = store.getWorkspaces();
  const clients = store.getClients();
  const tasks = store.getTasks();
  const cycles = store.getCycles();

  const refresh = useCallback(() => emit(), []);

  const addWorkspace = (data: Omit<import('@/lib/types').WorkspaceData, 'id'>) => {
    const w = { ...data, id: uid() };
    store.setWorkspaces([...store.getWorkspaces(), w]);
    emit();
  };

  const updateWorkspace = (id: string, patch: Partial<import('@/lib/types').WorkspaceData>) => {
    store.setWorkspaces(store.getWorkspaces().map(w => w.id === id ? { ...w, ...patch } : w));
    emit();
  };

  const removeWorkspace = (id: string) => {
    store.setWorkspaces(store.getWorkspaces().filter(w => w.id !== id));
    emit();
  };

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

  const { calendarService } = useGoogleDrive();

  const syncTaskToCalendar = (task: Task) => {
    if (!calendarService) return;
    const clientName = store.getClients().find(c => c.id === task.clientId)?.name || "Geral";
    calendarService.upsertTaskEvent(task, clientName).then(eventId => {
      if (eventId && eventId !== task.eventId) {
        store.setTasks(store.getTasks().map(t => t.id === task.id ? { ...t, eventId } : t));
        emit();
      }
    }).catch(console.error);
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
    syncTaskToCalendar(task);
    return task;
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    store.setTasks(store.getTasks().map(t => t.id === id ? { ...t, ...patch } : t));
    emit();
    const updated = store.getTasks().find(t => t.id === id);
    if (updated) syncTaskToCalendar(updated);
  };

  const removeTask = (id: string) => {
    const task = store.getTasks().find(t => t.id === id);
    if (task && task.eventId && calendarService) {
      calendarService.deleteEvent(task.eventId);
    }
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
    const updated = store.getTasks().find(t => t.id === id);
    if (updated) syncTaskToCalendar(updated);
  };

  return {
    workspaces, clients, tasks, cycles,
    addWorkspace, updateWorkspace, removeWorkspace,
    addClient, updateClient, removeClient,
    addTask, updateTask, removeTask, toggleTask,
    refresh, syncAllCycles: () => { syncAllCycles(); emit(); },
  };
}
