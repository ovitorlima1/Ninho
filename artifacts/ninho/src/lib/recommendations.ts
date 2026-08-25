import type { CategoryKey } from "./api";

export type Recommendation = {
  id: string;
  name: string;
  category: CategoryKey;
  summary: string;
  use: string;
  price: number;
  store: string;
  url: string;
  image: string;
  imagePosition?: string;
  featured?: boolean;
};

const searchLink = (query: string) =>
  `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}`;

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "body-manga-curta",
    name: "Bodies de algodão macio",
    category: "Roupas",
    summary: "Peças fáceis de vestir e combinar nos primeiros dias.",
    use: "camadas leves para o dia a dia",
    price: 59.9,
    store: "Amazon",
    url: searchLink("kit body bebê algodão manga curta"),
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
    price: 79.9,
    store: "Amazon",
    url: searchLink("cueiro musselina bebê kit"),
    image: "/images/berco-bebe.jpg",
    imagePosition: "center 42%",
  },
  {
    id: "kit-higiene",
    name: "Kit cuidado do bebê",
    category: "Higiene",
    summary: "O essencial para deixar a troca mais simples e organizada.",
    use: "banho e trocas com calma",
    price: 89.9,
    store: "Amazon",
    url: searchLink("kit higiene bebê cuidados recém nascido"),
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
    price: 69.9,
    store: "Amazon",
    url: searchLink("toalha bebê com capuz algodão"),
    image: "/images/berco-bebe.jpg",
    imagePosition: "center 70%",
  },
  {
    id: "mamadeira-anticolica",
    name: "Mamadeira anticólica",
    category: "Alimentação",
    summary: "Opção prática para montar uma rotina de alimentação flexível.",
    use: "apoio à alimentação",
    price: 52.9,
    store: "Amazon",
    url: searchLink("mamadeira anticólica recém nascido"),
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
    price: 39.9,
    store: "Amazon",
    url: searchLink("kit babador bebê bandana algodão"),
    image: "/images/berco-bebe.jpg",
    imagePosition: "left 54%",
  },
  {
    id: "bolsa-maternidade",
    name: "Bolsa maternidade funcional",
    category: "Acessórios",
    summary: "Compartimentos para encontrar cada coisa quando você precisar.",
    use: "maternidade e passeios",
    price: 189.9,
    store: "Amazon",
    url: searchLink("bolsa maternidade mochila compartimentos"),
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
    price: 74.9,
    store: "Amazon",
    url: searchLink("organizador fraldas bebê bolsa"),
    image: "/images/berco-bebe.jpg",
    imagePosition: "center 35%",
  },
];