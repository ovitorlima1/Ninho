import { useState } from "react";
import { Activity, Check, Gift, Heart, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Pill, TinyButton } from "@/components/controls";
import { type CategoryKey, type GiftReservationStatus, type ItemStatus } from "@/lib/api";
import { CATEGORIES, ITEM_STATUS_OPTIONS, describeItemTotal, type ChecklistItem } from "@/lib/items";
import { isRecommendationVisible } from "@/lib/recommendations";

export function ChecklistPanel({
  items, onToggle, onAdd, onEdit, onDelete, onOpenRecommendation, onUnlinkRecommendation,
  onReleaseGiftReservation, onUpdateGiftReservation, pendingItemId, isActionPending,
}: {
  items: ChecklistItem[];
  onToggle: (id: number, status: ItemStatus) => void;
  onAdd: (category: CategoryKey) => void;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (id: number) => void;
  onOpenRecommendation: (id: string) => void;
  onUnlinkRecommendation: (id: number) => void;
  onReleaseGiftReservation: (reservationId: number) => void;
  onUpdateGiftReservation: (reservationId: number, status: GiftReservationStatus) => void;
  /** Só a linha que está gravando fica travada; o resto da lista continua viva. */
  pendingItemId: number | null;
  isActionPending: boolean;
}) {
  const [category, setCategory] = useState<CategoryKey>("Roupas");
  const visible = items.filter((i) => i.category === category);
  const allDone = items.filter((i) => i.status !== "A comprar").length;

  return (
    <div className="screen checklist">
      <div className="screen-intro">
        <h2 className="screen-title">Tudo no lugar, na hora certa</h2>
        <p className="screen-lead"><strong>{allDone} de {items.length}</strong> itens resolvidos. Toque em um item para ajustar quantidade e preço.</p>
      </div>
      <div className="filter-row" role="group" aria-label="Categorias">
        {CATEGORIES.map((key) => (
          <Pill key={key} active={category === key} onClick={() => setCategory(key)} testId={`button-phone-category-${key.toLowerCase()}`}>{key}</Pill>
        ))}
      </div>
      <section className="card checklist-card" aria-labelledby="checklist-category-title">
        <div className="card-header">
          <h2 className="card-title" id="checklist-category-title">{category}</h2>
          <TinyButton onClick={() => onAdd(category)} label={`Adicionar item em ${category}`} testId="button-phone-add-item"><Plus size={18} /></TinyButton>
        </div>
        <div className="check-list" aria-busy={isActionPending}>
          {visible.length === 0 && (
            <div className="empty-category">
              <p>Nenhum item em {category} ainda.</p>
              <button type="button" className="text-action" onClick={() => onAdd(category)} data-testid="button-phone-add-category-item">
                <Plus size={13} /> adicionar primeiro item
              </button>
            </div>
          )}
          {visible.map((item) => (
            <div className={`check-item-row ${pendingItemId === item.id ? "is-saving" : ""}`} key={item.id}>
              <button
                type="button"
                className="check-item"
                onClick={() => onEdit(item)}
                disabled={pendingItemId === item.id}
                data-testid={`button-phone-check-${item.id}`}
              >
                <span className={`check-circle ${item.status !== "A comprar" ? "checked" : ""}`} aria-hidden>
                  {item.status === "Comprado" && <Check size={12} />}
                  {item.status === "Ganhei" && <Heart size={10} />}
                </span>
                <span className="check-name">
                  <strong>{item.name}</strong>
                  <small>{describeItemTotal(item)}</small>
                  {item.giftReservation && (
                    <span className="gift-reservation-owner">
                      <Gift size={11} />
                      {item.giftReservation.guestName || "Alguém"} {item.giftReservation.status}
                    </span>
                  )}
                </span>
                <span className="check-item-edit-hint" aria-hidden><Pencil size={13} /></span>
              </button>
              <div
                className="status-picker"
                role="radiogroup"
                aria-label={`Status de ${item.name}`}
              >
                {ITEM_STATUS_OPTIONS.map(({ value, label, short }) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={item.status === value}
                    className={`status-option ${item.status === value ? "selected" : ""}`}
                    onClick={() => item.status !== value && onToggle(item.id, value)}
                    disabled={pendingItemId === item.id}
                    title={label}
                    data-testid={`button-item-status-${item.id}-${value.replace(/\s/g, "-")}`}
                  >
                    {short}
                  </button>
                ))}
              </div>
                {item.recommendationId && (
                  <div className="check-recommendation-actions">
                    {isRecommendationVisible(item.recommendationId) ? (
                      <button
                        type="button"
                        className="check-recommendation-link"
                        onClick={() => onOpenRecommendation(item.recommendationId!)}
                        data-testid={`button-open-item-recommendation-${item.id}`}
                      >
                        <Sparkles size={10} /> ver inspiração
                      </button>
                    ) : (
                        <span className="check-recommendation-unavailable">inspiração indisponível</span>
                    )}
                    <button
                      type="button"
                      className="check-recommendation-unlink"
                      onClick={() => onUnlinkRecommendation(item.id)}
                      disabled={pendingItemId === item.id}
                      data-testid={`button-unlink-recommendation-${item.id}`}
                    >
                      desvincular
                    </button>
                  </div>
                )}
              {item.giftReservation && (
                <span className="gift-reservation-actions">
                  <button
                    type="button"
                    className="gift-reservation-status"
                    disabled={pendingItemId === item.id}
                    onClick={() => onUpdateGiftReservation(
                      item.giftReservation!.id,
                      item.giftReservation!.status === "vou presentear" ? "presenteado" : "vou presentear",
                    )}
                    data-testid={`button-gift-reservation-status-${item.id}`}
                  >
                    {item.giftReservation.status === "vou presentear" ? "marcar presenteado" : "marcar reservado"}
                  </button>
                  <button
                    type="button"
                    className="gift-reservation-release"
                    onClick={() => onReleaseGiftReservation(item.giftReservation!.id)}
                    disabled={pendingItemId === item.id}
                    data-testid={`button-gift-reservation-release-${item.id}`}
                  >
                    desfazer
                  </button>
                </span>
              )}
              <button type="button" className="delete-item-btn" onClick={() => onDelete(item.id)} disabled={pendingItemId === item.id} aria-label={`Remover ${item.name}`} data-testid={`button-phone-delete-${item.id}`}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="text-action" onClick={() => onAdd(category)} data-testid="button-phone-add-list-item">
          <Plus size={16} aria-hidden /> adicionar item
        </button>
      </section>
      <div className="log-card">
        <div className="log-title"><Activity size={15} /> seu progresso</div>
        <div className="log-row"><span className="log-dot" /><span>{allDone} de {items.length} itens resolvidos</span></div>
        {items.filter((i) => i.status !== "A comprar").slice(-1).map((i) => (
          <div className="log-row" key={i.id}><span className="log-dot dim" /><span>{i.name} marcado como {i.status.toLowerCase()}</span></div>
        ))}
      </div>
    </div>
  );
}
