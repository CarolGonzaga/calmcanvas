import { Client, Cycle, Task } from "./types";
import { store, uid } from "./storage";

// Add days to a date (returns new Date)
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + n);
  // handle month overflow
  if (x.getDate() < day) x.setDate(0);
  return x;
}
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function fmtDate(s: string): string {
  return parseISO(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
export function fmtDateLong(s: string): string {
  return parseISO(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
export function todayISO(): string {
  return toISO(new Date());
}
export function daysBetween(a: string, b: string): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86400000);
}

/**
 * Compute the active cycle window for a client based on startDate.
 * Cycles are monthly: [start, start+1month - 1day], next [start+1m, start+2m -1d], etc.
 */
export function computeCurrentCycle(client: Client, ref: Date = new Date()): { start: Date; end: Date; index: number } {
  const start = parseISO(client.startDate);
  let i = 0;
  let cs = start;
  let ce = addDays(addMonths(cs, 1), -1);
  while (ref > ce) {
    i++;
    cs = addMonths(start, i);
    ce = addDays(addMonths(start, i + 1), -1);
  }
  return { start: cs, end: ce, index: i + 1 };
}

/**
 * Ensure a Cycle exists for the given client/date and that tasks were generated for it.
 * Returns the cycle.
 */
export function ensureCycle(client: Client, ref: Date = new Date()): Cycle {
  const cycles = store.getCycles();
  const { start, end, index } = computeCurrentCycle(client, ref);
  const startISO = toISO(start);
  const endISO = toISO(end);

  let cycle = cycles.find(c => c.clientId === client.id && c.start === startISO);
  if (!cycle) {
    cycle = {
      id: uid(),
      clientId: client.id,
      start: startISO,
      end: endISO,
      index,
    };
    cycles.push(cycle);
    store.setCycles(cycles);
    // generate tasks from template
    const tasks = store.getTasks();
    for (const name of client.taskTemplate) {
      tasks.push({
        id: uid(),
        cycleId: cycle.id,
        clientId: client.id,
        workspace: client.workspace,
        name,
        status: "todo",
        createdAt: new Date().toISOString(),
      });
    }
    // add a report task at end of cycle
    tasks.push({
      id: uid(),
      cycleId: cycle.id,
      clientId: client.id,
      workspace: client.workspace,
      name: `Enviar relatório mensal`,
      status: "todo",
      dueDate: endISO,
      isReport: true,
      createdAt: new Date().toISOString(),
    });
    store.setTasks(tasks);
  }
  return cycle;
}

/** Make sure all clients have their current cycle materialized */
export function syncAllCycles() {
  const clients = store.getClients();
  for (const c of clients) ensureCycle(c);
}

export function clientProgress(clientId: string, cycleId: string) {
  const tasks = store.getTasks().filter(t => t.cycleId === cycleId && t.clientId === clientId && !t.isReport);
  const done = tasks.filter(t => t.status === "done").length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export function getOverdueTasks(): Task[] {
  const today = todayISO();
  return store.getTasks().filter(t => t.status !== "done" && t.dueDate && t.dueDate < today);
}
export function getTodayTasks(): Task[] {
  const today = todayISO();
  return store.getTasks().filter(t => t.status !== "done" && t.dueDate === today);
}
export function getUpcomingDeadlines(days = 7): Task[] {
  const today = todayISO();
  const horizon = toISO(addDays(new Date(), days));
  return store
    .getTasks()
    .filter(t => t.status !== "done" && t.dueDate && t.dueDate > today && t.dueDate <= horizon)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
}
