import { useState } from "react";
import { X, FileText, Download, Edit3 } from "lucide-react";
import { Client, Cycle, Task, WorkspaceData } from "@/lib/types";
import { fmtDateLong } from "@/lib/cycles";

// Load receipts from localStorage
function getReceipts(workspace: string, clientId?: string): { id: string; label: string; url: string; clientId?: string }[] {
  try {
    const all = JSON.parse(localStorage.getItem("foco.receipts") || "{}");
    const wsReceipts = (all[workspace] || []) as Array<{ id: string; label: string; url: string; clientId?: string }>;
    if (clientId) {
      return wsReceipts.filter(r => r.clientId === clientId);
    }
    return wsReceipts;
  } catch { return []; }
}

interface ReportData {
  monthYear: string;
  workspaceName: string;
  clientName: string;
  divulgacoes: string;
  tasks: { name: string; completedAt: string }[];
  receipts: { label: string; url: string }[];
}

interface Props {
  client: Client;
  cycle: Cycle;
  workspace: WorkspaceData;
  tasks: Task[];
  onClose: () => void;
}

export function ReportModal({ client, cycle, workspace, tasks, onClose }: Props) {
  const doneTasks = tasks
    .filter(t => t.cycleId === cycle.id && t.status === "done" && !t.isReport)
    .map(t => ({
      name: t.name,
      completedAt: t.completedAt
        ? new Date(t.completedAt).toLocaleDateString("pt-BR")
        : (t.dueDate ? new Date(t.dueDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"),
    }));

  const receipts = getReceipts(workspace.id, client.id);

  const cycleEnd = new Date(cycle.end + "T12:00:00");
  const initialData: ReportData = {
    monthYear: cycleEnd.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    workspaceName: workspace.name,
    clientName: client.name,
    divulgacoes: "",
    tasks: doneTasks,
    receipts,
  };

  const [data, setData] = useState<ReportData>(initialData);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const set = <K extends keyof ReportData>(field: K, value: ReportData[K]) =>
    setData(d => ({ ...d, [field]: value }));

  const updateTask = (idx: number, name: string, completedAt: string) =>
    setData(d => {
      const tasks = [...d.tasks];
      tasks[idx] = { name, completedAt };
      return { ...d, tasks };
    });

  // ─── PDF export ──────────────────────────────────────────────
  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210; const margin = 20;
    let y = 25;

    const addLine = (text: string, size = 11, bold = false, color = [40, 40, 40] as [number, number, number]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, W - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.4) + 3;
    };

    const addSpacer = (h = 5) => { y += h; };

    // Header
    addLine(data.monthYear.toUpperCase(), 10, false, [120, 90, 200]);
    addLine(`${data.workspaceName} — ${data.clientName}`, 18, true);
    addSpacer(4);

    // Separator
    doc.setDrawColor(200, 190, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    addSpacer(6);

    // Ações contratadas
    addLine("Ações contratadas:", 12, true);
    addSpacer(1);
    addLine(`Divulgações de ${data.divulgacoes || "[a preencher]"}`, 11);
    addSpacer(6);

    // Tasks
    addLine("Tarefas realizadas:", 12, true);
    addSpacer(2);
    data.tasks.forEach(t => {
      addLine(`• ${t.name}`, 10, false);
      if (t.completedAt && t.completedAt !== "—") {
        doc.setFontSize(9);
        doc.setTextColor(150, 140, 170);
        doc.setFont("helvetica", "normal");
        doc.text(`   Concluída em ${t.completedAt}`, margin, y);
        y += 5;
      }
    });
    addSpacer(6);

    // Comprovantes
    if (data.receipts.length > 0) {
      addLine("Comprovantes:", 12, true);
      addSpacer(2);
      data.receipts.forEach(r => {
        addLine(`• ${r.label}`, 10, false);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 220);
        doc.text(`   ${r.url}`, margin, y);
        y += 5;
      });
    }

    const filename = `relatorio-${data.clientName.toLowerCase().replace(/\s+/g, "-")}-ciclo${cycle.index}.pdf`;
    doc.save(filename);
  };

  // ─── DOCX export ─────────────────────────────────────────────
  const exportDOCX = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
    const children: Array<unknown> = [
      new Paragraph({
        text: data.monthYear.toUpperCase(),
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.LEFT,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `${data.workspaceName} — `, bold: true, size: 32 }),
          new TextRun({ text: data.clientName, bold: true, size: 32 }),
        ],
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        children: [new TextRun({ text: "Ações contratadas:", bold: true, size: 26 })],
      }),
      new Paragraph({
        text: `Divulgações de ${data.divulgacoes || "[a preencher]"}`,
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        children: [new TextRun({ text: "Tarefas realizadas:", bold: true, size: 26 })],
      }),
      ...data.tasks.flatMap(t => [
        new Paragraph({
          children: [
            new TextRun({ text: `• ${t.name}` }),
          ],
        }),
        t.completedAt && t.completedAt !== "—"
          ? new Paragraph({
              children: [new TextRun({ text: `   Concluída em ${t.completedAt}`, color: "888888", size: 18 })],
            })
          : null,
      ]).filter(Boolean) as Array<unknown>,
      new Paragraph({ text: "" }),
    ];

    if (data.receipts.length > 0) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: "Comprovantes:", bold: true, size: 26 })] }),
        ...data.receipts.map(r =>
          new Paragraph({ children: [
            new TextRun({ text: `• ${r.label}: ` }),
            new TextRun({ text: r.url, color: "4444CC" }),
          ]})
        )
      );
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `relatorio-${data.clientName.toLowerCase().replace(/\s+/g, "-")}-ciclo${cycle.index}.docx`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-[var(--shadow-strong)] border border-border/50 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="font-medium">Pré-visualização do Relatório</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-sm">
          {/* Month/Year */}
          <EditableField
            label="Mês e ano"
            value={data.monthYear}
            onChange={v => set("monthYear", v)}
            className="text-xs font-semibold uppercase tracking-widest text-primary"
          />

          {/* Title */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Cabeçalho</p>
            <p className="font-display text-xl font-semibold">
              <EditableInline value={data.workspaceName} onChange={v => set("workspaceName", v)} /> — <EditableInline value={data.clientName} onChange={v => set("clientName", v)} />
            </p>
          </div>

          <hr className="border-border/50" />

          {/* Ações contratadas */}
          <div>
            <p className="font-semibold mb-2">Ações contratadas:</p>
            <div className="flex items-baseline gap-1 text-sm">
              <span className="text-muted-foreground shrink-0">Divulgações de</span>
              <input
                type="text"
                value={data.divulgacoes}
                onChange={e => set("divulgacoes", e.target.value)}
                placeholder="[descreva aqui]"
                className="flex-1 border-b border-dashed border-border focus:border-primary focus:outline-none bg-transparent px-1"
              />
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Tarefas */}
          <div>
            <p className="font-semibold mb-3">Tarefas realizadas:</p>
            {data.tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">Nenhuma tarefa concluída neste ciclo.</p>
            ) : (
              <div className="space-y-2">
                {data.tasks.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2 group">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <div className="flex-1 min-w-0">
                      {editingIdx === idx ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={t.name}
                            onChange={e => updateTask(idx, e.target.value, t.completedAt)}
                            className="w-full border-b border-primary focus:outline-none bg-transparent text-sm"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={t.completedAt}
                            onChange={e => updateTask(idx, t.name, e.target.value)}
                            className="w-full text-xs text-muted-foreground border-b border-dashed border-border focus:outline-none bg-transparent"
                            placeholder="Data de conclusão"
                          />
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm">{t.name}</span>
                          {t.completedAt && t.completedAt !== "—" && (
                            <span className="block text-xs text-muted-foreground">Concluída em {t.completedAt}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                      className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comprovantes */}
          {data.receipts.length > 0 && (
            <>
              <hr className="border-border/50" />
              <div>
                <p className="font-semibold mb-3">Comprovantes:</p>
                <div className="space-y-2">
                  {data.receipts.map((r, idx) => (
                    <div key={idx} className="flex items-baseline gap-2">
                      <span className="text-primary shrink-0">•</span>
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{r.label}</span>
                        <span className="block text-xs text-primary/70 truncate">{r.url}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3 shrink-0 bg-muted/20">
          <p className="text-xs text-muted-foreground flex-1">
            Clique nos textos para editar antes de exportar.
          </p>
          <div className="flex gap-2">
            <button
              onClick={exportDOCX}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" /> Exportar DOCX
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline editable helpers ─────────────────────────────────
function EditableField({ label, value, onChange, className }: {
  label: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-transparent border-b border-dashed border-border/50 focus:border-primary focus:outline-none pb-0.5 ${className}`}
      />
    </div>
  );
}

function EditableInline({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-transparent border-b border-dashed border-border/50 focus:border-primary focus:outline-none font-display font-semibold text-xl w-auto min-w-[80px]"
      size={Math.max(value.length, 8)}
    />
  );
}
