import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { type RecommendationFeedback } from "@/components/action-feedback";
import { Pill } from "@/components/controls";
import { type CategoryKey } from "@/lib/api";
import { CATEGORIES, type ChecklistItem } from "@/lib/items";
import { getVisibleRecommendations, type Recommendation } from "@/lib/recommendations";
import { RecommendationCard } from "@/features/recommendations/recommendation-card";
import { RecommendationLinkModal } from "@/features/recommendations/recommendation-link-modal";
import { useRecommendationClock } from "@/features/recommendations/use-recommendation-clock";

export function RecommendationsPanel({
  items,
  onAddRecommendation,
  onLinkRecommendation,
  onOpenLinkedItem,
  isActionPending,
  feedback,
  focusId,
}: {
  items: ChecklistItem[];
  onAddRecommendation: (recommendation: Recommendation) => void;
  onLinkRecommendation: (recommendation: Recommendation, item: ChecklistItem) => void;
  onOpenLinkedItem: (item: ChecklistItem) => void;
  isActionPending: boolean;
  feedback: RecommendationFeedback | null;
  focusId: string | null;
}) {
  const [category, setCategory] = useState<"Para você" | CategoryKey>("Para você");
  const [linkingRecommendation, setLinkingRecommendation] = useState<Recommendation | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const handledFocusId = useRef<string | null>(null);
  const now = useRecommendationClock();
  const recommendations = getVisibleRecommendations(now);
  const pendingCategories = useMemo(
    () => new Set(items.filter((item) => item.status === "A comprar").map((item) => item.category)),
    [items],
  );
  const hasPersonalizedSuggestions = pendingCategories.size > 0;
  const visible = recommendations.filter((recommendation) => {
    if (category === "Para você") {
      return hasPersonalizedSuggestions
        ? pendingCategories.has(recommendation.category)
        : recommendation.featured;
    }
    return recommendation.category === category;
  });

  // Ao chegar com uma inspiração em foco, a categoria certa é escolhida durante
  // a renderização (padrão do React para ajustar estado a partir de props).
  const [categoryFocusId, setCategoryFocusId] = useState<string | null>(null);
  if (focusId !== categoryFocusId) {
    setCategoryFocusId(focusId);
    const target = focusId ? getVisibleRecommendations(now).find((item) => item.id === focusId) : undefined;
    if (target && category !== target.category) setCategory(target.category);
  }

  useEffect(() => {
    if (!focusId) {
      handledFocusId.current = null;
      return;
    }
    const recommendation = getVisibleRecommendations(now).find((item) => item.id === focusId);
    if (!recommendation || category !== recommendation.category) return;
    if (handledFocusId.current === focusId) return;
    handledFocusId.current = focusId;
    const frame = requestAnimationFrame(() => document.getElementById(`recommendation-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [category, focusId, now]);

  return (
    <div className="screen recommendations">
      <div className="screen-intro">
        <h2 className="screen-title">Ideias para o que falta</h2>
        <p className="screen-lead">{hasPersonalizedSuggestions ? "Sugestões para as categorias que ainda têm itens pendentes." : "Uma seleção editorial do Ninho para os próximos passos do enxoval."}</p>
      </div>
      <div className="filter-row recommendation-filters" aria-label="Filtrar inspirações">
        <Pill active={category === "Para você"} onClick={() => setCategory("Para você")} testId="button-recommendation-for-you">Para você</Pill>
        {CATEGORIES.map((key) => (
          <Pill key={key} active={category === key} onClick={() => setCategory(key)} testId={`button-recommendation-category-${key.toLowerCase()}`}>{key}</Pill>
        ))}
      </div>
      {feedback && <div className={`recommendation-feedback recommendation-feedback-${feedback.tone}`} role="status">{feedback.tone === "success" ? <CheckCircle2 size={14} /> : <X size={14} />}{feedback.message}</div>}
      {availabilityNotice && <div className="recommendation-feedback recommendation-feedback-error" role="status">{availabilityNotice}</div>}
      <div className="recommendation-grid">
        {visible.map((recommendation) => (
          (() => {
            const linkedItem = items.find((item) => item.recommendationId === recommendation.id);
            const matchingItems = items.filter((item) => item.category === recommendation.category && !item.recommendationId);
            return (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                isRelevant={pendingCategories.has(recommendation.category)}
                linkedItem={linkedItem}
                matchingItems={matchingItems}
                onAdd={() => matchingItems.length ? setLinkingRecommendation(recommendation) : onAddRecommendation(recommendation)}
                onOpenLinkedItem={onOpenLinkedItem}
                onExpired={() => setAvailabilityNotice("Esta inspiração acabou de expirar. Atualize a página para ver opções revisadas.")}
                isPending={isActionPending}
                now={now}
              />
            );
          })()
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-recommendations">
          <Sparkles size={24} />
          <p>Nenhuma inspiração encontrada nessa categoria.</p>
        </div>
      )}
      <p className="recommendation-disclaimer">O Ninho seleciona cada inspiração e não vende os produtos. Ao escolher uma delas, você será direcionada para a loja externa.</p>
      {linkingRecommendation && (
        <RecommendationLinkModal
          recommendation={linkingRecommendation}
          items={items.filter((item) => item.category === linkingRecommendation.category && !item.recommendationId)}
          onClose={() => setLinkingRecommendation(null)}
          onCreate={() => { onAddRecommendation(linkingRecommendation); setLinkingRecommendation(null); }}
          onLink={(item) => { onLinkRecommendation(linkingRecommendation, item); setLinkingRecommendation(null); }}
          isPending={isActionPending}
        />
      )}
    </div>
  );
}
