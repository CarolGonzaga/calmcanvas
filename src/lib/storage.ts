// Storage layer using localStorage with typed helpers
import { Client, Task, Cycle, Workspace, NoteBlock } from "./types";

const KEYS = {
  clients: "foco.clients",
  tasks: "foco.tasks",
  cycles: "foco.cycles",
  notes: "foco.notes",
  reportsSent: "foco.reportsSent",
  seeded: "foco.seeded.v1",
};

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

export const store = {
  getClients: (): Client[] => read(KEYS.clients, []),
  setClients: (c: Client[]) => write(KEYS.clients, c),

  getTasks: (): Task[] => read(KEYS.tasks, []),
  setTasks: (t: Task[]) => write(KEYS.tasks, t),

  getCycles: (): Cycle[] => read(KEYS.cycles, []),
  setCycles: (c: Cycle[]) => write(KEYS.cycles, c),

  getNotes: (workspace: Workspace): NoteBlock[] =>
    read(`${KEYS.notes}.${workspace}`, []),
  setNotes: (workspace: Workspace, n: NoteBlock[]) =>
    write(`${KEYS.notes}.${workspace}`, n),

  getReportsSent: (): Record<string, string> => read(KEYS.reportsSent, {}),
  setReportsSent: (r: Record<string, string>) => write(KEYS.reportsSent, r),

  isSeeded: () => localStorage.getItem(KEYS.seeded) === "1",
  markSeeded: () => localStorage.setItem(KEYS.seeded, "1"),
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
