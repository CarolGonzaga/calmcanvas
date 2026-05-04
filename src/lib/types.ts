export type Workspace = "publique" | "mariana" | "saficos";

export type TaskStatus = "todo" | "doing" | "done";

export interface Client {
  id: string;
  name: string;
  startDate: string; // ISO date
  taskTemplate: string[]; // names of recurring tasks
  reportDayOffset?: number; // days before cycle end to remind report (default 0 = last day)
  color?: string;
  workspace: Workspace; // usually 'saficos'
  createdAt: string;
}

export interface Cycle {
  id: string;
  clientId: string;
  start: string; // ISO date inclusive
  end: string;   // ISO date inclusive
  index: number; // 1-based cycle number
}

export interface Task {
  id: string;
  cycleId?: string;
  clientId?: string;
  workspace: Workspace;
  name: string;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  isReport?: boolean;
}

export interface NoteBlock {
  id: string;
  type: "heading" | "text" | "checklist";
  content: string;
  items?: { id: string; text: string; done: boolean }[];
}
