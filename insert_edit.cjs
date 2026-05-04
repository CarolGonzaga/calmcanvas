const fs = require('fs');
const file = 'src/components/ClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const componentCode = `
function EditClientModal({ client, onClose, onSave }: { client: any; onClose: () => void; onSave: (data: { name: string; startDate: string; endDate?: string; taskTemplate: string[] }) => void; }) {
  const [name, setName] = useState(client.name);
  const [startDate, setStartDate] = useState(client.startDate);
  const [endDate, setEndDate] = useState(client.endDate || '');
  const [templateText, setTemplateText] = useState(client.taskTemplate.join('\\n'));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskTemplate = templateText.split('\\n').map(t => t.trim()).filter(Boolean);
    onSave({ name: name.trim(), startDate, endDate: endDate || undefined, taskTemplate });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
      <form onSubmit={submit} className="bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Editar projeto</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Nome do projeto</span>
          <input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Início do projeto</span>
            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Fim do projeto <span className="text-muted-foreground font-normal">(Opcional)</span></span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Tarefas recorrentes (uma por linha)</span>
          <textarea rows={5} value={templateText} onChange={e => setTemplateText(e.target.value)} className="mt-1 w-full px-4 py-3 leading-relaxed rounded-xl bg-background border border-border focus:border-primary focus:outline-none resize-y text-sm" placeholder="Ex:\n[URGENTE] Revisar doc\nReunião com cliente" />
        </label>
        <div className="flex justify-end gap-2 pt-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted">Cancelar</button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">Salvar alterações</button>
        </div>
      </form>
    </div>
  );
}
`;

content = content.replace('function ProjectDriveFiles', componentCode + '\nfunction ProjectDriveFiles');
fs.writeFileSync(file, content);
console.log('done');
