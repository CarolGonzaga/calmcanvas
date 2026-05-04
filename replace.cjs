const fs = require('fs');
const file = 'src/components/ClientsView.tsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const newBlock = `          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={copyText}
              title="Copiar texto"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={clearText}
              title="Limpar guia atual"
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-border/60 mx-1" />
            <button
              type="button"
              onClick={() => setManageTabsOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              title="Gerenciar guias"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Textarea: increased height and leading-relaxed for spacing */}
        <textarea
          value={tabs[activeTab] || ""}
          onChange={handleNotesChange}
          placeholder={\`Anote links, referências e informações em '\${activeTab}'...\`}
          className="w-full min-h-[300px] leading-relaxed px-4 py-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-primary resize-y"
        />
      </div>`;
lines.splice(554, 51, newBlock);
fs.writeFileSync(file, lines.join('\\n'));
console.log('done');
