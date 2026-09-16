import { useRef } from "react";
import { ChevronRight, Plus, X } from "lucide-react";
import { TinyButton } from "@/components/controls";
import { ModalShell } from "@/components/modal-shell";
import { type ChecklistItem } from "@/lib/items";
import { type Recommendation } from "@/lib/recommendations";

export function RecommendationLinkModal({
  recommendation,
  items,
  onClose,
  onCreate,
  onLink,
  isPending,
}: {
  recommendation: Recommendation;
  items: ChecklistItem[];
  onClose: () => void;
  onCreate: () => void;
  onLink: (item: ChecklistItem) => void;
  isPending: boolean;
}) {
  const createButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <ModalShell
      className="recommendation-link-modal"
      labelledBy={`recommendation-link-title-${recommendation.id}`}
      describedBy={`recommendation-link-description-${recommendation.id}`}
      onClose={onClose}
      initialFocusRef={createButtonRef}
    >
      <>
        <div className="modal-top">
          <div><span className="eyebrow">PARA A SUA LISTA</span><h2 id={`recommendation-link-title-${recommendation.id}`}>Como salvar esta inspiração?</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-recommendation-modal"><X size={17} /></TinyButton>
        </div>
        <p className="recommendation-link-description" id={`recommendation-link-description-${recommendation.id}`}>
          <strong>{recommendation.name}</strong> combina com {items.length === 1 ? "um item" : "itens"} de {recommendation.category.toLowerCase()} que já está {items.length === 1 ? "na sua lista" : "na sua lista"}.
        </p>
        <button ref={createButtonRef} type="button" className="primary-button" onClick={onCreate} disabled={isPending} data-testid={`button-create-recommendation-item-${recommendation.id}`}>
          <Plus size={14} /> adicionar como item novo
        </button>
        <div className="recommendation-existing">
          <span className="eyebrow">VINCULAR A UM ITEM EXISTENTE</span>
          {items.map((item) => (
            <button type="button" className="recommendation-existing-item" key={item.id} onClick={() => onLink(item)} disabled={isPending} data-testid={`button-link-recommendation-${recommendation.id}-${item.id}`}>
              <span><strong>{item.name}</strong><small>{item.qty} un. · {item.status}</small></span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <p className="recommendation-link-note">A inspiração fica ligada ao item, mas você continua comprando onde preferir.</p>
      </>
    </ModalShell>
  );
}
