const fs = require('fs');
const file = 'src/lib/storage.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { Client, Task, Cycle, Workspace, NoteBlock } from "./types";',
  'import { Client, Task, Cycle, Workspace, WorkspaceData, NoteBlock } from "./types";'
);

content = content.replace(
  'clients: "foco.clients",',
  'clients: "foco.clients",\n  workspaces: "foco.workspaces",'
);

content = content.replace(
  'export const store = {',
  `export const store = {
  getWorkspaces: (): WorkspaceData[] => read(KEYS.workspaces, [
    { id: "saficos", name: "Lendo Sáficos", sub: "projetos & ciclos", icon: "BookHeart" },
    { id: "mariana", name: "Trabalho com Mariana", sub: "equipe", icon: "Users" },
    { id: "publique", name: "Publique", sub: "notas livres", icon: "Sparkles" }
  ]),
  setWorkspaces: (w: WorkspaceData[]) => write(KEYS.workspaces, w),`
);

fs.writeFileSync(file, content);
console.log('done');
