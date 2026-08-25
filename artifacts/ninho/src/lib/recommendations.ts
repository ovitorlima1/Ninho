type ReviewDate = `${number}-${number}-${number}`;
export type RecommendationVisibility = "visible" | "hidden";
export type RecommendationCategory = "Roupas" | "Higiene" | "Alimentação" | "Acessórios";

export type Recommendation = {
  id: string;
  name: string;
  category: RecommendationCategory;
  summary: string;
  use: string;
  price: number | null;
  store: string;
  url: string;
  reviewedAt: ReviewDate;
  expiresAt: ReviewDate;
  visibility: RecommendationVisibility;
  image: string;
  imagePosition?: string;
  featured?: boolean;
};

export type RecommendationDisplayState = {
  available: boolean;
  storeUrl: string | null;
};

const searchLink = (query: string) =>
  `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}`;

/**
 * Curadoria editorial. Atualize somente este catálogo ao revisar uma sugestão:
 * ajuste preço/link, registre a nova revisão e expiração, ou use `hidden` para
 * tirá-la da vitrine sem apagar referências já salvas pelas usuárias.
 */
export const RECOMMENDATION_CATALOG: readonly Recommendation[] = [
  {
    id: "body-manga-curta",
    name: "Bodies de algodão macio",
    category: "Roupas",
    summary: "Peças fáceis de vestir e combinar nos primeiros dias.",
    use: "camadas leves para o dia a dia",
    price: null,
    store: "Amazon",
    url: searchLink("kit body bebê algodão manga curta"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/quarto-bebe.jpg",
    imagePosition: "center 64%",
    featured: true,
  },
  {
    id: "cueiro-muslin",
    name: "Cueiro de musselina",
    category: "Roupas",
    summary: "Leve, respirável e versátil para aconchegar sem excesso.",
    use: "manta, apoio ou proteção",
    price: null,
    store: "Amazon",
    url: searchLink("cueiro musselina bebê kit"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/berco-bebe.jpg",
    imagePosition: "center 42%",
  },
  {
    id: "kit-higiene",
    name: "Kit cuidado do bebê",
    category: "Higiene",
    summary: "O essencial para deixar a troca mais simples e organizada.",
    use: "banho e trocas com calma",
    price: null,
    store: "Amazon",
    url: searchLink("kit higiene bebê cuidados recém nascido"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/quarto-bebe.jpg",
    imagePosition: "center 32%",
    featured: true,
  },
  {
    id: "toalha-capuz",
    name: "Toalha com capuz",
    category: "Higiene",
    summary: "Uma camada quentinha para sair do banho sem pressa.",
    use: "banho e pós-banho",
    price: null,
    store: "Amazon",
    url: searchLink("toalha bebê com capuz algodão"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/berco-bebe.jpg",
    imagePosition: "center 70%",
  },
  {
    id: "mamadeira-anticolica",
    name: "Mamadeira anticólica",
    category: "Alimentação",
    summary: "Opção prática para montar uma rotina de alimentação flexível.",
    use: "apoio à alimentação",
    price: null,
    store: "Amazon",
    url: searchLink("mamadeira anticólica recém nascido"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/quarto-bebe.jpg",
    imagePosition: "right 56%",
    featured: true,
  },
  {
    id: "babador-bandana",
    name: "Babadores absorventes",
    category: "Alimentação",
    summary: "Pequenos aliados para manter as trocas de roupa sob controle.",
    use: "alimentação e dentição",
    price: null,
    store: "Amazon",
    url: searchLink("kit babador bebê bandana algodão"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/berco-bebe.jpg",
    imagePosition: "left 54%",
  },
  {
    id: "bolsa-maternidade",
    name: "Bolsa maternidade funcional",
    category: "Acessórios",
    summary: "Compartimentos para encontrar cada coisa quando você precisar.",
    use: "maternidade e passeios",
    price: null,
    store: "Amazon",
    url: searchLink("bolsa maternidade mochila compartimentos"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/quarto-bebe.jpg",
    imagePosition: "center 48%",
    featured: true,
  },
  {
    id: "organizador-fraldas",
    name: "Organizador de fraldas",
    category: "Acessórios",
    summary: "Tudo à mão para transformar a troca em um gesto mais leve.",
    use: "cômoda e estação de troca",
    price: null,
    store: "Amazon",
    url: searchLink("organizador fraldas bebê bolsa"),
    reviewedAt: "2026-08-25",
    expiresAt: "2026-09-24",
    visibility: "visible",
    image: "/images/berco-bebe.jpg",
    imagePosition: "center 35%",
  },
];

function catalogDate(value: ReviewDate, endOfDay = false): Date | null {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSafeStoreUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isRecommendationAvailable(recommendation: Recommendation, now = new Date()): boolean {
  if (recommendation.visibility !== "visible" || !isSafeStoreUrl(recommendation.url)) return false;

  const reviewedAt = catalogDate(recommendation.reviewedAt);
  const expiresAt = catalogDate(recommendation.expiresAt, true);
  return Boolean(
    reviewedAt
    && expiresAt
    && reviewedAt.getTime() <= now.getTime()
    && reviewedAt.getTime() <= expiresAt.getTime()
    && now.getTime() <= expiresAt.getTime(),
  );
}

export function getRecommendationDisplayState(
  recommendation: Recommendation,
  now = new Date(),
): RecommendationDisplayState {
  const available = isRecommendationAvailable(recommendation, now);
  return { available, storeUrl: available ? recommendation.url : null };
}

export function getVisibleRecommendations(
  now = new Date(),
  catalog: readonly Recommendation[] = RECOMMENDATION_CATALOG,
): Recommendation[] {
  return catalog.filter((recommendation) => isRecommendationAvailable(recommendation, now));
}

export function getNextRecommendationRefreshDelay(
  now = new Date(),
  catalog: readonly Recommendation[] = RECOMMENDATION_CATALOG,
): number {
  const nextExpiration = catalog
    .filter((recommendation) => recommendation.visibility === "visible")
    .map((recommendation) => catalogDate(recommendation.expiresAt, true)?.getTime())
    .filter((expiresAt): expiresAt is number => expiresAt !== undefined && expiresAt >= now.getTime())
    .sort((first, second) => first - second)[0];

  return nextExpiration === undefined
    ? 60 * 60 * 1000
    : Math.max(1, nextExpiration - now.getTime() + 1);
}

/** Snapshot compatível para consumidores que só precisam do catálogo atual. */
export const RECOMMENDATIONS = getVisibleRecommendations();

export function isRecommendationVisible(id: string): boolean {
  return getVisibleRecommendations().some((recommendation) => recommendation.id === id);
}
