const fs = require('fs');
const file = 'src/pages/Index.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [workspace, setWorkspace] = useState<Workspace>("saficos");',
  'const [workspace, setWorkspace] = useState<Workspace>("saficos");\n  const { workspaces, syncAllCycles } = useFocoData();'
);

content = content.replace(
  'const { syncAllCycles } = useFocoData();',
  `useEffect(() => {
    if (!workspaces.find(w => w.id === workspace) && workspaces.length > 0) {
      setWorkspace(workspaces[0].id);
    }
  }, [workspaces, workspace]);`
);

content = content.replace(
  '...(workspace === "saficos" ? [{ id: "reports" as View, label: "Relatórios", icon: FileText }] : []),',
  '{ id: "reports" as View, label: "Relatórios", icon: FileText },'
);

fs.writeFileSync(file, content);
console.log('done');
