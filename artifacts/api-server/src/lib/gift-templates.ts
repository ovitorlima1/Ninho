import { type GIFT_LIST_TEMPLATES, type GiftItemKind } from "@workspace/db/schema";

type TemplateItem = {
  name: string;
  kind: GiftItemKind;
  goalCents?: number;
  goalUnits?: number;
  unitLabel?: string;
  note?: string;
};

/** Ponto de partida de cada modelo: tudo editável e removível depois (LP-R2). */
export const GIFT_TEMPLATES: Record<(typeof GIFT_LIST_TEMPLATES)[number], { name: string; items: TemplateItem[] }> = {
  "cha-de-fralda": {
    name: "Chá de fralda",
    items: [
      { name: "Fralda RN", kind: "units", goalUnits: 6, unitLabel: "pacotes" },
      { name: "Fralda P", kind: "units", goalUnits: 12, unitLabel: "pacotes" },
      { name: "Fralda M", kind: "units", goalUnits: 15, unitLabel: "pacotes" },
      { name: "Fralda G", kind: "units", goalUnits: 10, unitLabel: "pacotes" },
      { name: "Lenço umedecido", kind: "units", goalUnits: 10, unitLabel: "pacotes" },
      { name: "Pomada para assaduras", kind: "units", goalUnits: 3, unitLabel: "unidades" },
    ],
  },
  "cha-de-bebe": {
    name: "Chá de bebê",
    items: [
      { name: "Carrinho de bebê", kind: "money", goalCents: 120000 },
      { name: "Berço", kind: "money", goalCents: 90000 },
      { name: "Cadeirinha para carro", kind: "money", goalCents: 80000 },
      { name: "Banheira", kind: "single" },
      { name: "Kit de mamadeiras", kind: "single" },
      { name: "Fralda P", kind: "units", goalUnits: 10, unitLabel: "pacotes" },
    ],
  },
  "em-branco": { name: "Lista de presentes", items: [] },
};
