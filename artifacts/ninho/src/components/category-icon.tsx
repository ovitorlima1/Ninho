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
