const fs = require('fs');
const file = 'src/hooks/useGoogleDrive.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'store.setReportsSent(db.reportsSent || {});',
  'store.setReportsSent(db.reportsSent || {});\n          if (db.workspaces) store.setWorkspaces(db.workspaces);'
);

content = content.replace(
  'notes: {\n          saficos: store.getNotes("saficos"),\n          mariana: store.getNotes("mariana"),\n          publique: store.getNotes("publique"),\n        }',
  `workspaces: store.getWorkspaces(),
        notes: store.getWorkspaces().reduce((acc, ws) => { acc[ws.id] = store.getNotes(ws.id); return acc; }, {} as Record<string, any>)`
);

fs.writeFileSync(file, content);
console.log('done');
