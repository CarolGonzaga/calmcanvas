import { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles, Users, BookHeart } from "lucide-react";

interface Props {
  active: Workspace;
  onChange: (w: Workspace) => void;
}

const items: { id: Workspace; label: string; icon: any; sub: string }[] = [
  { id: "saficos", label: "Lendo Sáficos", icon: BookHeart, sub: "clientes & ciclos" },
  { id: "mariana", label: "Trabalho com Mariana", icon: Users, sub: "equipe" },
  { id: "publique", label: "Publique", icon: Sparkles, sub: "notas livres" },
];

export function WorkspaceTabs({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-2xl">
      {items.map(it => {
        const Icon = it.icon;
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cn(
              "flex-1 min-w-[140px] flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left",
              isActive
                ? "bg-card shadow-[var(--shadow-soft)] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
              isActive ? "bg-primary-soft text-primary" : "bg-background text-muted-foreground"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium">{it.label}</div>
              <div className="text-[11px] opacity-70">{it.sub}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
