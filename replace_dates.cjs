const fs = require('fs');
const file = 'src/components/ClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldText1 = `<div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Início do contrato: {fmtDateLong(c.startDate)}</span>
                    <button
                      onClick={() => { if (confirm(\`Remover \${c.name}?\`)) removeClient(c.id); }}
                      className="hover:text-destructive transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover projeto
                    </button>
                  </div>`;

const newText1 = `<div className="pt-3 mt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>Início do projeto: {fmtDateLong(c.startDate)}</span>
                      {c.endDate && <span>Fim do projeto: {fmtDateLong(c.endDate)}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setEditingClient(c)}
                        className="hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Settings className="w-3.5 h-3.5" /> Editar projeto
                      </button>
                      <button
                        onClick={() => { if (confirm(\`Remover \${c.name}?\`)) removeClient(c.id); }}
                        className="hover:text-destructive transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remover projeto
                      </button>
                    </div>
                  </div>`;

content = content.replace(oldText1, newText1).replace(oldText1.replace(/\n/g, '\r\n'), newText1);
fs.writeFileSync(file, content);
console.log('done');
