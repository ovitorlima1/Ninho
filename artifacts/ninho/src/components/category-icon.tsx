import { Bath, BedDouble, Briefcase, ClipboardCheck, Heart, Shirt, Sparkles, Utensils } from "lucide-react";

const ICONS: Record<string, typeof Heart> = {
  heart: Heart,
  clipboard: ClipboardCheck,
  utensils: Utensils,
  sparkles: Sparkles,
  shirt: Shirt,
  bath: Bath,
  bed: BedDouble,
  briefcase: Briefcase,
};

/** Ícones que a mãe pode escolher para uma categoria, com o nome lido pelo leitor de tela. */
export const CATEGORY_ICON_OPTIONS: { id: string; label: string }[] = [
  { id: "heart", label: "Coração" },
  { id: "shirt", label: "Roupa" },
  { id: "bath", label: "Banho" },
  { id: "utensils", label: "Talheres" },
  { id: "bed", label: "Cama" },
  { id: "briefcase", label: "Mala" },
  { id: "clipboard", label: "Prancheta" },
  { id: "sparkles", label: "Brilho" },
];

/** Cara das quatro categorias do modelo, para quem só tem o nome (inspirações e links antigos). */
const LOOK_BY_NAME: Record<string, { icon: string; tone: string }> = {
  Roupas: { icon: "heart", tone: "lilac" },
  Higiene: { icon: "clipboard", tone: "mint" },
  Alimentação: { icon: "utensils", tone: "peach" },
  Acessórios: { icon: "sparkles", tone: "butter" },
};

const TONES = new Set(["lilac", "mint", "peach", "butter"]);

type Look = {
  /** Nome da categoria: usado quando não há ícone nem cor gravados. */
  category?: string;
  icon?: string | null;
  tone?: string | null;
};

/** Ícone da categoria: o que a mãe escolheu ou, na falta, o do nome. */
export function CategoryIcon({ category, icon, size = 18 }: Look & { size?: number }) {
  const Icon = ICONS[icon ?? LOOK_BY_NAME[category ?? ""]?.icon ?? "heart"] ?? Heart;
  return <Icon size={size} aria-hidden />;
}

/**
 * Ícone da categoria num quadrado com a cor dela (design system: malva, menta, pêssego e
 * manteiga). Decorativo: o nome da categoria vem sempre ao lado.
 */
export function CategoryBadge({ category, icon, tone, small = false }: Look & { small?: boolean }) {
  const wanted = tone ?? LOOK_BY_NAME[category ?? ""]?.tone ?? "lilac";
  return (
    <span className={`cat-badge cat-${TONES.has(wanted) ? wanted : "lilac"} ${small ? "cat-badge-sm" : ""}`.trim()} aria-hidden>
      <CategoryIcon category={category} icon={icon} size={small ? 14 : 18} />
    </span>
  );
}
