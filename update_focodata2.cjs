const fs = require('fs');
const file = 'src/hooks/useFocoData.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const clients = store.getClients();',
  'const workspaces = store.getWorkspaces();\n  const clients = store.getClients();'
);

content = content.replace(
  'const addClient =',
  `const addWorkspace = (data: Omit<import('@/lib/types').WorkspaceData, 'id'>) => {
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

  const addClient =`
);

content = content.replace('clients, tasks, cycles,', 'workspaces, clients, tasks, cycles,');
content = content.replace('addClient, updateClient, removeClient,', 'addWorkspace, updateWorkspace, removeWorkspace,\n    addClient, updateClient, removeClient,');

fs.writeFileSync(file, content);
console.log('done');
