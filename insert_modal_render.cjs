const fs = require('fs');
const file = 'src/components/ClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldText = `{showForm && (
        <NewClientModal
          workspace={workspace}
          onClose={() => setShowForm(false)}
          onSave={(data) => { addClient({ ...data, workspace }); setShowForm(false); }}
        />
      )}`;

const newText = `{showForm && (
        <NewClientModal
          workspace={workspace}
          onClose={() => setShowForm(false)}
          onSave={(data) => { addClient({ ...data, workspace }); setShowForm(false); }}
        />
      )}

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={(data) => {
            updateClient(editingClient.id, data);
            setEditingClient(null);
          }}
        />
      )}`;

content = content.replace(oldText, newText).replace(oldText.replace(/\n/g, '\r\n'), newText);
fs.writeFileSync(file, content);
console.log('done');
