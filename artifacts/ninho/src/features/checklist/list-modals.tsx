import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Trash2, X } from "lucide-react";
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from "@/components/category-icon";
import { TinyButton } from "@/components/controls";
import { ConfirmDialog, ModalShell } from "@/components/modal-shell";
import { type ChecklistTemplate } from "@/lib/api";
import {
  CATEGORY_NAME_MAX,
  CHECKLIST_TEMPLATES,
  LIST_NAME_MAX,
  countItems,
  isNameTaken,
  type Checklist,
  type ListCategory,
} from "@/lib/checklists";
import { getFriendlyErrorMessage } from "@/lib/errors";

function ModalTop({ eyebrow, title, titleId, onClose }: { eyebrow: string; title: string; titleId: string; onClose: () => void }) {
  return (
    <div className="modal-top">
      <div><span className="eyebrow">{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
      <TinyButton onClick={onClose} label="Fechar" testId="button-close-checklist-modal"><X size={17} /></TinyButton>
    </div>
  );
}

/** Em vez de criar além do limite, o app explica (LC-R12, LC-R21). */
export function LimitDialog({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <ModalShell labelledBy="limit-dialog-title" onClose={onClose} onSubmit={onClose}>
      <>
        <ModalTop eyebrow="Enxoval" title={title} titleId="limit-dialog-title" onClose={onClose} />
        <p data-testid="limit-message">{message}</p>
        <button type="submit" className="primary-button" data-testid="button-limit-ok">entendi</button>
      </>
    </ModalShell>
  );
}

// ─── Listas ──────────────────────────────────────────────────────────────────

export function CreateChecklistModal({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { template: ChecklistTemplate; name: string }) => Promise<unknown>;
}) {
  const first = CHECKLIST_TEMPLATES[0]!;
  const [template, setTemplate] = useState(first);
  const [name, setName] = useState(first.name);
  const [touched, setTouched] = useState(false);
  const create = useMutation({
    mutationFn: () => onCreate({ template: template.id, name: name.trim() || template.name }),
    onSuccess: onClose,
  });

  const choose = (next: (typeof CHECKLIST_TEMPLATES)[number]) => {
    setTemplate(next);
    // O nome acompanha o modelo até a pessoa escrever o próprio.
    if (!touched) setName(next.name);
  };

  return (
    <ModalShell labelledBy="create-checklist-title" onClose={onClose} onSubmit={() => !create.isPending && create.mutate()}>
      <>
        <ModalTop eyebrow="Enxoval" title="Nova lista" titleId="create-checklist-title" onClose={onClose} />
        <div className="choice-list" role="radiogroup" aria-label="Modelo da lista">
          {CHECKLIST_TEMPLATES.map((option) => (
            <button
              type="button"
              key={option.id}
              role="radio"
              aria-checked={template.id === option.id}
              className={`choice-card ${template.id === option.id ? "is-selected" : ""}`}
              onClick={() => choose(option)}
              data-testid={`button-checklist-template-${option.id}`}
            >
              <span className="choice-mark" aria-hidden>{template.id === option.id && <Check size={14} />}</span>
              <span className="choice-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
            </button>
          ))}
        </div>
        <label className="modal-label">
          Nome da lista
          <input value={name} maxLength={LIST_NAME_MAX} onChange={(event) => { setName(event.target.value); setTouched(true); }} data-testid="input-checklist-name" />
          {template.id !== "em-branco" && <span className="field-hint">Os itens do modelo são sugestões: dá para apagar e editar depois.</span>}
        </label>
        {create.isError && <p className="field-error" role="alert">{getFriendlyErrorMessage(create.error)}</p>}
        <button type="submit" className="primary-button" disabled={create.isPending} data-testid="button-confirm-create-checklist">
          {create.isPending ? "criando…" : "criar lista"}
        </button>
      </>
    </ModalShell>
  );
}

export function EditChecklistModal({
  list, itemCount, isOnlyList, onClose, onRename, onDelete,
}: {
  list: Checklist;
  itemCount: number;
  isOnlyList: boolean;
  onClose: () => void;
  onRename: (name: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [name, setName] = useState(list.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useMutation({ mutationFn: () => onRename(name.trim()), onSuccess: onClose });
  const remove = useMutation({ mutationFn: onDelete, onSuccess: onClose });

  // A confirmação troca de lugar com o diálogo (um formulário não cabe dentro do outro).
  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title={`Excluir “${list.name}”?`}
        description={itemCount > 0
          ? `${countItems(itemCount)} ${itemCount === 1 ? "será apagado" : "serão apagados"}, com as categorias e os valores planejados desta lista. Não dá para desfazer.`
          : "A lista está vazia. As categorias e os valores planejados dela saem do Orçamento. Não dá para desfazer."}
        confirmLabel="excluir lista"
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <ModalShell labelledBy="edit-checklist-title" onClose={onClose} onSubmit={() => !save.isPending && name.trim() && save.mutate()}>
      <>
        <ModalTop eyebrow="Enxoval" title="Editar lista" titleId="edit-checklist-title" onClose={onClose} />
        <label className="modal-label">
          Nome da lista
          <input value={name} maxLength={LIST_NAME_MAX} onChange={(event) => setName(event.target.value)} data-testid="input-checklist-name" />
        </label>
        {(save.isError || remove.isError) && <p className="field-error" role="alert">{getFriendlyErrorMessage(save.error ?? remove.error)}</p>}
        <button type="submit" className="primary-button" disabled={save.isPending || remove.isPending || !name.trim()} data-testid="button-save-checklist">
          {save.isPending ? "salvando…" : "salvar"}
        </button>
        {isOnlyList ? (
          <p className="field-hint" data-testid="hint-only-list">Esta é a sua única lista: dá para renomear, mas não excluir.</p>
        ) : (
          <button type="button" className="text-action danger-action" onClick={() => setConfirmingDelete(true)} disabled={remove.isPending} data-testid="button-delete-checklist">
            <Trash2 size={14} aria-hidden /> {remove.isPending ? "excluindo…" : "excluir esta lista"}
          </button>
        )}
      </>
    </ModalShell>
  );
}

// ─── Categorias ──────────────────────────────────────────────────────────────

/** Criar (sem `category`) ou editar uma categoria: nome e ícone; a cor é automática. */
export function CategoryModal({
  category, siblings, itemCount = 0, onClose, onSave, onDelete,
}: {
  category?: ListCategory;
  /** Todas as categorias da lista, para avisar de nome repetido antes de enviar. */
  siblings: ListCategory[];
  itemCount?: number;
  onClose: () => void;
  onSave: (data: { name: string; icon: string }) => Promise<unknown>;
  onDelete?: (moveTo: number | null) => Promise<unknown>;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "heart");
  const [deleting, setDeleting] = useState(false);
  const save = useMutation({ mutationFn: () => onSave({ name: name.trim(), icon }), onSuccess: onClose });
  const remove = useMutation({ mutationFn: (moveTo: number | null) => onDelete!(moveTo), onSuccess: onClose });

  const others = siblings.filter((sibling) => sibling.id !== category?.id);
  const taken = name.trim() !== "" && isNameTaken(name, siblings, category?.id);
  const error = taken
    ? "Já existe uma categoria com esse nome nesta lista."
    : save.isError || remove.isError ? getFriendlyErrorMessage(save.error ?? remove.error) : null;

  if (category && deleting) {
    return (
      <DeleteCategoryDialog
        category={category}
        itemCount={itemCount}
        others={others}
        onClose={() => setDeleting(false)}
        onDelete={(moveTo) => remove.mutate(moveTo)}
      />
    );
  }

  return (
    <ModalShell
      labelledBy="category-modal-title"
      onClose={onClose}
      onSubmit={() => !save.isPending && name.trim() && !taken && save.mutate()}
    >
      <>
        <ModalTop eyebrow="Enxoval" title={category ? "Editar categoria" : "Nova categoria"} titleId="category-modal-title" onClose={onClose} />
        <label className="modal-label">
          Nome da categoria
          <input
            value={name}
            maxLength={CATEGORY_NAME_MAX}
            onChange={(event) => { setName(event.target.value); save.reset(); }}
            placeholder="ex.: Passeio"
            aria-invalid={taken ? true : undefined}
            aria-describedby={error ? "category-name-error" : undefined}
            data-testid="input-category-name"
          />
        </label>
        <div className="icon-picker" role="radiogroup" aria-label="Ícone da categoria">
          {CATEGORY_ICON_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.id}
              role="radio"
              aria-checked={icon === option.id}
              aria-label={option.label}
              title={option.label}
              className={`icon-option ${icon === option.id ? "is-selected" : ""}`}
              onClick={() => setIcon(option.id)}
              data-testid={`button-category-icon-${option.id}`}
            >
              <CategoryIcon icon={option.id} size={20} />
            </button>
          ))}
        </div>
        {error && <p className="field-error" role="alert" id="category-name-error">{error}</p>}
        <button type="submit" className="primary-button" disabled={save.isPending || remove.isPending || !name.trim() || taken} data-testid="button-save-category">
          {save.isPending ? "salvando…" : category ? "salvar" : "criar categoria"}
        </button>
        {category && onDelete && (others.length === 0 ? (
          <p className="field-hint" data-testid="hint-only-category">Esta é a única categoria da lista: dá para renomear, mas não excluir.</p>
        ) : (
          <button type="button" className="text-action danger-action" onClick={() => setDeleting(true)} disabled={remove.isPending} data-testid="button-delete-category">
            <Trash2 size={14} aria-hidden /> {remove.isPending ? "excluindo…" : "excluir esta categoria"}
          </button>
        ))}
      </>
    </ModalShell>
  );
}

/** Excluir categoria: vazia pede só a confirmação; com itens, a mãe escolhe para onde eles vão (LC-R10). */
function DeleteCategoryDialog({
  category, itemCount, others, onClose, onDelete,
}: {
  category: ListCategory;
  itemCount: number;
  others: ListCategory[];
  onClose: () => void;
  onDelete: (moveTo: number | null) => void;
}) {
  const [mode, setMode] = useState<"move" | "delete">("move");
  const [target, setTarget] = useState(others[0]!.id);

  if (itemCount === 0) {
    return (
      <ConfirmDialog
        title={`Excluir “${category.name}”?`}
        description="A categoria está vazia. A linha dela sai do Orçamento."
        confirmLabel="excluir categoria"
        onConfirm={() => onDelete(null)}
        onClose={onClose}
      />
    );
  }

  const count = countItems(itemCount);
  const options = [
    { id: "move" as const, title: "Mover para outra categoria", description: `${itemCount === 1 ? "O item continua" : "Os itens continuam"} na lista.` },
    { id: "delete" as const, title: `Apagar ${itemCount === 1 ? "o item" : `os ${count}`} junto`, description: "Não dá para desfazer." },
  ];
  return (
    <ModalShell
      labelledBy="delete-category-title"
      onClose={onClose}
      onSubmit={() => { onDelete(mode === "move" ? target : null); onClose(); }}
    >
      <>
        <ModalTop eyebrow="Confirmar" title={`Excluir “${category.name}”?`} titleId="delete-category-title" onClose={onClose} />
        <p>Esta categoria tem <strong>{count}</strong>. O que fazer com {itemCount === 1 ? "ele" : "eles"}?</p>
        <div className="choice-list" role="radiogroup" aria-label="O que fazer com os itens">
          {options.map((option) => (
            <button
              type="button"
              key={option.id}
              role="radio"
              aria-checked={mode === option.id}
              className={`choice-card ${mode === option.id ? "is-selected" : ""}`}
              onClick={() => setMode(option.id)}
              data-testid={`button-category-items-${option.id}`}
            >
              <span className="choice-mark" aria-hidden>{mode === option.id && <Check size={14} />}</span>
              <span className="choice-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
            </button>
          ))}
        </div>
        {mode === "move" && (
          <label className="modal-label">
            Mover para
            <select value={target} onChange={(event) => setTarget(Number(event.target.value))} data-testid="select-category-target">
              {others.map((other) => <option key={other.id} value={other.id}>{other.name}</option>)}
            </select>
          </label>
        )}
        <button type="submit" className={`primary-button ${mode === "delete" ? "danger-button" : ""}`.trim()} data-testid="button-confirm-delete-category">
          excluir categoria
        </button>
        <button type="button" className="text-action confirm-cancel" onClick={onClose} data-testid="button-cancel-delete-category">cancelar</button>
      </>
    </ModalShell>
  );
}
