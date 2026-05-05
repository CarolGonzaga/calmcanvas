const fs = require('fs');
const file = 'src/components/ClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use CRLF line endings since this file uses CRLF
const oldModal = `function NewClientModal({ workspace, onClose, onSave }: {\r\n  workspace: Workspace;\r\n  onClose: () => void;\r\n  onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void;\r\n}) {\r\n  const [name, setName] = useState("");\r\n  const [startDate, setStartDate] = useState(todayISO());\r\n  const [endDate, setEndDate] = useState("");\r\n\r\n  const optionsList = [\r\n    'Lançamento', 'Pré-venda ebook', 'Pré-venda físico', 'Trecho no x',\r\n    'Story temático', 'Divulgação na comunidade', 'Thread', 'Carrossel',\r\n    'Reels', 'Stories em vídeo'\r\n  ];\r\n\r\n  const [quantities, setQuantities] = useState<Record<string, number>>({});\r\n  const [extras, setExtras] = useState<{ id: string, name: string, qty: number, recurring: boolean, urgency: "urgent" | "today" | "whenever" }[]>([]);`;

const newModal = `function NewClientModal({ workspace, onClose, onSave }: {\r\n  workspace: Workspace;\r\n  onClose: () => void;\r\n  onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void;\r\n}) {\r\n  const { workspaces } = useFocoData();\r\n  const wsData = workspaces.find(w => w.id === workspace);\r\n  const [name, setName] = useState("");\r\n  const [startDate, setStartDate] = useState(todayISO());\r\n  const [endDate, setEndDate] = useState("");\r\n\r\n  const optionsList = [\r\n    'Lançamento', 'Pré-venda ebook', 'Pré-venda físico', 'Trecho no x',\r\n    'Story temático', 'Divulgação na comunidade', 'Thread', 'Carrossel',\r\n    'Reels', 'Stories em vídeo'\r\n  ];\r\n\r\n  const [quantities, setQuantities] = useState<Record<string, number>>({});\r\n  const [extras, setExtras] = useState<{ id: string, name: string, qty: number, recurring: boolean, urgency: "urgent" | "today" | "whenever" }[]>(() => {\r\n    const defaults = wsData?.defaultTaskTemplate || [];\r\n    return defaults.map(task => ({\r\n      id: Math.random().toString(),\r\n      name: task,\r\n      qty: 1,\r\n      recurring: true,\r\n      urgency: "whenever" as const,\r\n    }));\r\n  });`;

if (content.includes(oldModal)) {
  content = content.replace(oldModal, newModal);
  fs.writeFileSync(file, content);
  console.log('replaced successfully');
} else {
  console.log('not found, trying partial match');
  const idx = content.indexOf('function NewClientModal');
  console.log('found at:', idx);
  console.log('snippet:', JSON.stringify(content.slice(idx, idx+600)));
}
