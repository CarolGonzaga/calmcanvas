const fs = require('fs');
const file = 'src/components/ClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add workspaces to useFocoData import in ClientsView — already imported via useFocoData hook
// 2. Patch NewClientModal function to use workspace defaultTaskTemplate

const oldModal = `function NewClientModal({ workspace, onClose, onSave }: {
  workspace: Workspace;
  onClose: () => void;
  onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");

  const optionsList = [
    'Lançamento', 'Pré-venda ebook', 'Pré-venda físico', 'Trecho no x',
    'Story temático', 'Divulgação na comunidade', 'Thread', 'Carrossel',
    'Reels', 'Stories em vídeo'
  ];

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<{ id: string, name: string, qty: number, recurring: boolean, urgency: "urgent" | "today" | "whenever" }[]>([]);`;

const newModal = `function NewClientModal({ workspace, onClose, onSave }: {
  workspace: Workspace;
  onClose: () => void;
  onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void;
}) {
  const { workspaces } = useFocoData();
  const wsData = workspaces.find(w => w.id === workspace);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");

  const optionsList = [
    'Lançamento', 'Pré-venda ebook', 'Pré-venda físico', 'Trecho no x',
    'Story temático', 'Divulgação na comunidade', 'Thread', 'Carrossel',
    'Reels', 'Stories em vídeo'
  ];

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<{ id: string, name: string, qty: number, recurring: boolean, urgency: "urgent" | "today" | "whenever" }[]>(() => {
    const defaults = wsData?.defaultTaskTemplate || [];
    return defaults.map(task => ({
      id: Math.random().toString(),
      name: task,
      qty: 1,
      recurring: true,
      urgency: "whenever" as const,
    }));
  });`;

content = content.replace(oldModal, newModal);
fs.writeFileSync(file, content);
console.log('done, replaced:', content.includes('wsData?.defaultTaskTemplate'));
