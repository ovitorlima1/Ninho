import { useState } from "react";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";
import { CategoryBadge } from "@/components/category-icon";
import { DraftNumberInput } from "@/components/draft-number-input";
import { Progress } from "@/components/progress";
import { calcBudgetRows, calcSpent } from "@/lib/budget";
import { type Checklist, type ListCategory } from "@/lib/checklists";
import { money } from "@/lib/format";
import { formatPriceInput, parsePriceInput, type ChecklistItem } from "@/lib/items";

/**
 * Orçamento: uma linha por categoria, com o valor planejado editável (LC-R13). Com mais de uma
 * lista, as linhas vêm agrupadas por lista; "investido" e "planejado" somam todas (LC-R22).
 */
export function BudgetPanel({
  items, lists, categories, onSave, onEdit, saveState,
}: {
  items: ChecklistItem[];
  lists: Checklist[];
  categories: ListCategory[];
  onSave: (categories: Array<{ categoryId: number; planned: number }>) => void;
  onEdit: () => void;
  saveState: "idle" | "saving" | "success" | "error";
}) {
  const [planned, setPlanned] = useState<Record<number, number>>(() => {
    const r: Record<number, number> = {};
    for (const c of categories) r[c.id] = c.planned;
    return r;
  });
  // Sem effect de sincronia: o Workspace remonta este painel (key) quando o orçamento salvo muda.
  const [dirty, setDirty] = useState(false);

  const spent = calcSpent(items);
  const rows = calcBudgetRows(items, categories.map((c) => ({ id: c.id, planned: planned[c.id] ?? 0 })));
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const total = rows.reduce((sum, row) => sum + row.planned, 0);
  const grouped = lists.length > 1;
  const nameOf = (c: ListCategory) => grouped ? `${c.name} (${lists.find((l) => l.id === c.listId)?.name})` : c.name;
  const overBudget = categories.filter((c) => (rowById.get(c.id)?.over ?? 0) > 0);

  const handleChange = (categoryId: number, val: number) => {
    setPlanned((p) => ({ ...p, [categoryId]: val }));
    setDirty(true);
    onEdit();
  };

  const save = () => {
    onSave(categories.map((c) => ({ categoryId: c.id, planned: planned[c.id] || 0 })));
  };

  const renderRow = (c: ListCategory) => {
    const row = rowById.get(c.id)!;
    return (
      <label className="budget-row" key={c.id}>
        <span className="budget-row-label">
          <span className="budget-row-name"><CategoryBadge icon={c.icon} tone={c.tone} small />{c.name}</span>
          <small>{money(row.spent)} de {money(row.planned)}</small>
          <Progress value={row.planned > 0 ? (row.spent / row.planned) * 100 : 0} label={`${nameOf(c)}: gasto em relação ao planejado`} tone={row.spent > row.planned ? "brand" : "accent"} />
        </span>
        <span className="price-input budget-price-input">
          <span aria-hidden>R$</span>
          <DraftNumberInput
            inputMode="decimal"
            value={row.planned}
            parse={parsePriceInput}
            format={formatPriceInput}
            aria-label={`Orçamento planejado para ${nameOf(c)}, em reais`}
            onChange={(value) => handleChange(c.id, value)}
            disabled={saveState === "saving"}
            placeholder="0,00"
            data-testid={`input-phone-budget-${c.id}`}
          />
        </span>
      </label>
    );
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
      {overBudget.length > 0 && (
        <p className="budget-over" role="status" data-testid="budget-over-notice">
          <AlertCircle size={18} aria-hidden />
          <span>
            {overBudget.map((c) => `${nameOf(c)} passou ${money(rowById.get(c.id)!.over)} do previsto`).join("; ")}.
          </span>
        </p>
      )}
      <section className="card budget-list" aria-busy={saveState === "saving"} aria-labelledby="budget-list-title" data-testid="budget-edit-card">
        <div className="card-header"><h2 className="card-title" id="budget-list-title">Por categoria</h2><span className="card-meta">planejado editável</span></div>
        {grouped
          ? lists.map((list) => (
            <div className="budget-group" role="group" aria-labelledby={`budget-group-${list.id}`} key={list.id}>
              <h3 className="budget-group-title" id={`budget-group-${list.id}`}>{list.name}</h3>
              {categories.filter((c) => c.listId === list.id).map(renderRow)}
            </div>
          ))
          : categories.map(renderRow)}
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
