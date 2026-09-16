import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { DraftNumberInput } from "@/components/draft-number-input";
import { Progress } from "@/components/progress";
import { type ServerBudgetCategory } from "@/lib/api";
import { calcSpent, calcSpentByCategory } from "@/lib/budget";
import { money } from "@/lib/format";
import { CATEGORIES, formatPriceInput, parsePriceInput, type ChecklistItem } from "@/lib/items";

export function BudgetPanel({
  items, budget, onSave, onEdit, saveState,
}: {
  items: ChecklistItem[];
  budget: ServerBudgetCategory[];
  onSave: (categories: Array<{ category: string; planned: number }>) => void;
  onEdit: () => void;
  saveState: "idle" | "saving" | "success" | "error";
}) {
  const [planned, setPlanned] = useState<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    for (const b of budget) r[b.category] = parseFloat(b.planned) || 0;
    return r;
  });
  // Sem effect de sincronia: o Workspace remonta este painel (key) quando o orçamento salvo muda.
  const [dirty, setDirty] = useState(false);

  const spent = calcSpent(items);
  const total = Object.values(planned).reduce((s, v) => s + v, 0);

  const handleChange = (cat: string, val: number) => {
    setPlanned((p) => ({ ...p, [cat]: val }));
    setDirty(true);
    onEdit();
  };

  const save = () => {
    onSave(CATEGORIES.map((c) => ({ category: c, planned: planned[c] || 0 })));
  };

  return (
    <div className="screen budget">
      <div className="screen-intro">
        <h2 className="screen-title">Um olhar calmo para o orçamento</h2>
        <p className="screen-lead">Valores são uma bússola, não uma regra.</p>
      </div>
      <div className="budget-total">
        <span className="eyebrow">Investido até aqui</span>
        <strong>{money(spent)}</strong>
        <small>de {money(total)} planejados</small>
        <Progress value={total > 0 ? (spent / total) * 100 : 0} label="Orçamento usado" size="lg" tone={spent > total ? "brand" : "accent"} />
      </div>
      <section className="card budget-list" aria-busy={saveState === "saving"} aria-labelledby="budget-list-title" data-testid="budget-edit-card">
        <div className="card-header"><h2 className="card-title" id="budget-list-title">Por categoria</h2><span className="card-meta">planejado editável</span></div>
        {CATEGORIES.map((cat) => {
          const spentHere = calcSpentByCategory(items, cat);
          const plannedHere = planned[cat] ?? 0;
          return (
            <label className="budget-row" key={cat}>
              <span className="budget-row-label">
                {cat}
                <small>{money(spentHere)} de {money(plannedHere)}</small>
                <Progress value={plannedHere > 0 ? (spentHere / plannedHere) * 100 : 0} label={`${cat}: gasto em relação ao planejado`} tone={spentHere > plannedHere ? "brand" : "accent"} />
              </span>
              <span className="price-input budget-price-input">
                <span aria-hidden>R$</span>
                <DraftNumberInput
                  inputMode="decimal"
                  value={plannedHere}
                  parse={parsePriceInput}
                  format={formatPriceInput}
                  aria-label={`Orçamento planejado para ${cat}, em reais`}
                  onChange={(planned) => handleChange(cat, planned)}
                  disabled={saveState === "saving"}
                  placeholder="0,00"
                  data-testid={`input-phone-budget-${cat.toLowerCase()}`}
                />
              </span>
            </label>
          );
        })}
        {saveState === "success" && !dirty && (
          <div className="budget-save-message budget-save-success" role="status">
            <CheckCircle2 size={14} /> Orçamento salvo.
          </div>
        )}
        {saveState === "error" && (
          <div className="budget-save-message budget-save-error" role="alert">
            Não foi possível salvar. Seus valores continuam aqui para tentar novamente.
          </div>
        )}
        {dirty && (
          <button type="button" className="primary-button" style={{ marginTop: 12 }} onClick={save} disabled={saveState === "saving"} data-testid="button-save-budget">
            {saveState === "saving" ? "salvando…" : <><Check size={14} /> salvar orçamento</>}
          </button>
        )}
      </section>
    </div>
  );
}
