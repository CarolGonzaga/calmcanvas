const fs = require('fs');
const file = 'src/hooks/useFocoData.ts';
let content = fs.readFileSync(file, 'utf8');

const oldText = `  const addTask = (t: Omit<Task, "id" | "createdAt" | "status"> & { status?: Task["status"] }) => {
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
  };`;

const newText = `  const { calendarService } = useGoogleDrive();

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
  };`;

content = content.replace(oldText, newText).replace(oldText.replace(/\n/g, '\r\n'), newText);
fs.writeFileSync(file, content);
console.log('done');
