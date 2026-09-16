import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Pill, TinyButton } from "@/components/controls";
import { DraftNumberInput, parseQtyInput } from "@/components/draft-number-input";
import { ModalShell } from "@/components/modal-shell";
import { type CategoryKey } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { CATEGORIES, formatPriceInput, parsePriceInput, type ChecklistItem } from "@/lib/items";

export type ItemFormValues = { name: string; category: CategoryKey; qty: number; price: number };

/** Campos compartilhados por adicionar e editar item. */
export function ItemFields({
  values, onChange, priceError,
}: {
  values: ItemFormValues;
  onChange: (values: ItemFormValues) => void;
  priceError: string | null;
}) {
  return (
    <>
      <div className="filter-row" style={{ marginBottom: 12 }}>
        {CATEGORIES.map((k) => (
          <Pill key={k} active={values.category === k} onClick={() => onChange({ ...values, category: k })} testId={`button-modal-cat-${k}`}>{k}</Pill>
        ))}
      </div>
      <label className="modal-label">
        NOME DO ITEM
        <input
          value={values.name}
          maxLength={200}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          placeholder="ex.: manta para o carrinho"
          data-testid="input-new-item"
        />
      </label>
      <div className="item-form-row">
        <label className="modal-label">
          QUANTIDADE
          <DraftNumberInput
            inputMode="numeric"
            value={values.qty}
            parse={parseQtyInput}
            format={String}
            onChange={(qty) => onChange({ ...values, qty })}
            data-testid="input-item-qty"
          />
        </label>
        <label className="modal-label">
          PREÇO POR UNIDADE
          <span className="price-input">
            <span aria-hidden>R$</span>
            <DraftNumberInput
              inputMode="decimal"
              value={values.price}
              parse={parsePriceInput}
              format={formatPriceInput}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? "item-price-error" : undefined}
              onChange={(price) => onChange({ ...values, price })}
              placeholder="0,00"
              data-testid="input-item-price"
            />
          </span>
        </label>
      </div>
      {priceError && <p className="field-error" role="alert" id="item-price-error">{priceError}</p>}
      <p>Este item entra em <strong>{values.category}</strong>.</p>
    </>
  );
}

export function AddItemModal({
  onClose, onAdd, category, returnFocusTestId,
}: {
  onClose: () => void;
  onAdd: (values: ItemFormValues) => Promise<void>;
  category: CategoryKey;
  returnFocusTestId?: string;
}) {
  const [values, setValues] = useState<ItemFormValues>({ name: "", category, qty: 1, price: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Só fecha depois do sucesso: em erro o que foi digitado continua na tela.
  const submit = async () => {
    if (!values.name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onAdd({ ...values, name: values.name.trim() });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell labelledBy="add-item-title" onClose={onClose} onSubmit={submit} returnFocusTestId={returnFocusTestId}>
      <>
        <div className="modal-top">
          <div><span className="eyebrow">SUA LISTA, SUAS REGRAS</span><h2 id="add-item-title">Adicionar item</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-add-item"><X size={17} /></TinyButton>
        </div>
        <ItemFields values={values} onChange={setValues} priceError={null} />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button" disabled={!values.name.trim() || isSaving} data-testid="button-confirm-add-item">
          <Plus size={15} /> {isSaving ? "salvando…" : "colocar na lista"}
        </button>
      </>
    </ModalShell>
  );
}

export function EditItemModal({
  item, onClose, onSave,
}: {
  item: ChecklistItem;
  onClose: () => void;
  onSave: (id: number, values: ItemFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ItemFormValues>({
    name: item.name,
    category: item.category,
    qty: item.qty,
    price: item.price,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!values.name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(item.id, { ...values, name: values.name.trim() });
      onClose();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell labelledBy="edit-item-title" onClose={onClose} onSubmit={submit} returnFocusTestId={`button-phone-check-${item.id}`}>
      <>
        <div className="modal-top">
          <div><span className="eyebrow">AJUSTAR ITEM</span><h2 id="edit-item-title">{item.name}</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-edit-item"><X size={17} /></TinyButton>
        </div>
        <ItemFields values={values} onChange={setValues} priceError={null} />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button" disabled={!values.name.trim() || isSaving} data-testid="button-confirm-edit-item">
          <Check size={15} /> {isSaving ? "salvando…" : "salvar alterações"}
        </button>
      </>
    </ModalShell>
  );
}
