import { ClipboardCheck, Heart, Sparkles, Utensils } from "lucide-react";
import type { CategoryKey } from "@/lib/api";

const ICONS: Record<CategoryKey, typeof Heart> = {
  Roupas: Heart,
  Higiene: ClipboardCheck,
  Alimentação: Utensils,
  Acessórios: Sparkles,
};

/** Ícone de cada categoria do enxoval, usado na lista pública e nas inspirações. */
export function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = ICONS[category as CategoryKey] ?? Heart;
  return <Icon size={size} aria-hidden />;
}

const CATEGORY_TONE: Record<CategoryKey, string> = {
  Roupas: "lilac",
  Higiene: "mint",
  Alimentação: "peach",
  Acessórios: "butter",
};

/**
 * Ícone da categoria num quadrado com a cor dela (design system: Roupas malva, Higiene menta,
 * Alimentação pêssego, Acessórios manteiga). Decorativo: o nome da categoria vem sempre ao lado.
 */
export function CategoryBadge({ category, small = false }: { category: string; small?: boolean }) {
  const tone = CATEGORY_TONE[category as CategoryKey] ?? "lilac";
  return (
    <span className={`cat-badge cat-${tone} ${small ? "cat-badge-sm" : ""}`.trim()} aria-hidden>
      <CategoryIcon category={category} size={small ? 14 : 18} />
    </span>
  );
}
