import { type CategoryIcon, type CategoryTone, type ChecklistTemplate } from "@workspace/db/schema";

export type TemplateItem = {
  name: string;
  group: string;
  qty: number;
  /** Preço unitário em reais; "0" = sem preço, a mãe preenche. */
  price: string;
  essential: boolean;
};

export type TemplateCategory = {
  name: string;
  icon: CategoryIcon;
  tone: CategoryTone;
  /** Valor planejado no Orçamento, em reais. */
  planned: string;
  items: TemplateItem[];
};

const item = (name: string, group: string, qty = 1, price = "0", essential = false): TemplateItem =>
  ({ name, group, qty, price, essential });

/**
 * Ponto de partida de cada modelo: tudo entra como sugestão, editável e removível (LC-R17).
 * Só o enxoval tem preço e valor planejado; nos outros a mãe preenche.
 */
export const CHECKLIST_TEMPLATE_DATA: Record<ChecklistTemplate, { name: string; categories: TemplateCategory[] }> = {
  enxoval: {
    name: "Enxoval do bebê",
    categories: [
      {
        name: "Roupas", icon: "heart", tone: "lilac", planned: "1240",
        items: [
          item("Body manga curta", "RN · essenciais", 6, "38", true),
          item("Macacão de algodão", "0–3 meses", 5, "74", true),
          item("Cueiro leve", "Primeiros dias", 3, "42"),
        ],
      },
      {
        name: "Higiene", icon: "clipboard", tone: "mint", planned: "680",
        items: [
          item("Toalha com capuz", "Banho", 2, "58", true),
          item("Fralda de pano", "Troca", 8, "12", true),
          item("Kit primeiros cuidados", "Farmacinha", 1, "96"),
        ],
      },
      {
        name: "Alimentação", icon: "utensils", tone: "peach", planned: "520",
        items: [
          item("Mamadeira anticólica", "Apoio", 2, "64"),
          item("Babador de tecido", "Dia a dia", 5, "16"),
        ],
      },
      {
        name: "Acessórios", icon: "sparkles", tone: "butter", planned: "940",
        items: [
          item("Trocador portátil", "Passeio", 1, "88"),
          item("Bolsa da maternidade", "Maternidade", 1, "310", true),
        ],
      },
    ],
  },
  "mala-maternidade": {
    name: "Mala da maternidade",
    categories: [
      {
        name: "Para a mãe", icon: "heart", tone: "lilac", planned: "0",
        items: [
          item("Camisola ou pijama com abertura", "Roupas", 3),
          item("Sutiã de amamentação", "Roupas", 2),
          item("Absorvente pós-parto", "Cuidados", 2),
          item("Chinelo", "Roupas"),
          item("Itens de higiene pessoal", "Cuidados"),
        ],
      },
      {
        name: "Para o bebê", icon: "shirt", tone: "mint", planned: "0",
        items: [
          item("Saída de maternidade", "Roupas", 1, "0", true),
          item("Body e macacão RN", "Roupas", 4, "0", true),
          item("Fralda RN", "Troca", 1, "0", true),
          item("Manta", "Roupas", 2),
          item("Meias e luvas", "Roupas", 3),
        ],
      },
      {
        name: "Documentos", icon: "briefcase", tone: "peach", planned: "0",
        items: [
          item("Documento com foto", "Levar", 1, "0", true),
          item("Cartão do pré-natal e exames", "Levar", 1, "0", true),
          item("Carteirinha do plano ou cartão do SUS", "Levar", 1, "0", true),
        ],
      },
    ],
  },
  "quarto-do-bebe": {
    name: "Quarto do bebê",
    categories: [
      {
        name: "Móveis", icon: "bed", tone: "lilac", planned: "0",
        items: [
          item("Berço", "Dormir", 1, "0", true),
          item("Colchão do berço", "Dormir", 1, "0", true),
          item("Cômoda com trocador", "Troca"),
          item("Poltrona de amamentação", "Apoio"),
        ],
      },
      {
        name: "Roupa de cama", icon: "shirt", tone: "mint", planned: "0",
        items: [
          item("Lençol com elástico", "Berço", 3, "0", true),
          item("Protetor de colchão impermeável", "Berço", 2),
          item("Manta", "Berço", 2),
        ],
      },
      {
        name: "Organização", icon: "sparkles", tone: "peach", planned: "0",
        items: [
          item("Cestos organizadores", "Guardar", 3),
          item("Lixeira com tampa", "Troca"),
          item("Luminária de luz suave", "Noite"),
        ],
      },
    ],
  },
  "em-branco": {
    name: "Minha lista",
    categories: [{ name: "Geral", icon: "sparkles", tone: "lilac", planned: "0", items: [] }],
  },
};
