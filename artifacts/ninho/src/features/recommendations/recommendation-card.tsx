import { ArrowUpRight, Check, Plus, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { formatDate, money } from "@/lib/format";
import { type ChecklistItem } from "@/lib/items";
import { getRecommendationDisplayState, type Recommendation } from "@/lib/recommendations";

export function RecommendationCard({
  recommendation,
  isRelevant,
  linkedItem,
  matchingItems,
  onAdd,
  onOpenLinkedItem,
  onExpired,
  isPending,
  now,
}: {
  recommendation: Recommendation;
  isRelevant: boolean;
  linkedItem?: ChecklistItem;
  matchingItems: ChecklistItem[];
  onAdd: () => void;
  onOpenLinkedItem: (item: ChecklistItem) => void;
  onExpired: () => void;
  isPending: boolean;
  now: Date;
}) {
  const displayState = getRecommendationDisplayState(recommendation, now);
  if (!displayState.storeUrl) return null;

  return (
    <article className={`recommendation-card ${linkedItem ? "recommendation-card-linked" : ""}`} id={`recommendation-${recommendation.id}`}>
      {/* Sem foto: as imagens antigas eram 2 fotos genéricas de quarto repetidas
          em todos os cards, que não mostravam o produto. */}
      <div className="recommendation-visual">
        <span className="recommendation-visual-icon"><CategoryIcon category={recommendation.category} size={22} /></span>
        <span className="recommendation-category">{recommendation.category}</span>
        {isRelevant && <span className="recommendation-match"><Sparkles size={12} aria-hidden /> combina com sua lista</span>}
      </div>
      <div className="recommendation-copy">
        <span className="eyebrow">{recommendation.use}</span>
        <h3>{recommendation.name}</h3>
        <p>{recommendation.summary}</p>
        <div className="recommendation-footer">
          <div>
            <strong className={recommendation.price === null ? "recommendation-price-unavailable" : ""}>
              {recommendation.price === null ? "Preço a confirmar" : money(recommendation.price)}
            </strong>
            <small>{recommendation.price === null ? `consulte na ${recommendation.store}` : `em ${recommendation.store}`}</small>
            <time className="recommendation-review" dateTime={recommendation.reviewedAt}>revisado em {formatDate(recommendation.reviewedAt)}</time>
          </div>
          <div className="recommendation-actions">
            {linkedItem ? (
              <button
                type="button"
                className="recommendation-add-button recommendation-add-done"
                onClick={() => onOpenLinkedItem(linkedItem)}
                data-testid={`button-recommendation-added-${recommendation.id}`}
              >
                <Check size={12} /> salvo na sua lista
              </button>
            ) : (
              <button
                type="button"
                className="recommendation-add-button"
                onClick={onAdd}
                disabled={isPending}
                data-testid={`button-add-recommendation-${recommendation.id}`}
              >
                <Plus size={12} /> {matchingItems.length ? "salvar ou vincular" : "salvar na lista"}
              </button>
            )}
            <a
              href={displayState.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (!getRecommendationDisplayState(recommendation).storeUrl) {
                  event.preventDefault();
                  onExpired();
                }
              }}
              aria-label={`Abrir ${recommendation.name} na loja externa`}
              data-testid={`link-recommendation-${recommendation.id}`}
            >
              abrir loja externa <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
