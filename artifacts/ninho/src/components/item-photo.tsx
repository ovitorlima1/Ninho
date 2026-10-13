import { photoUrl } from "@/lib/photos";

const SIDE = { sm: 48, md: 72 } as const;

/**
 * Foto do produto. Miniaturas têm tamanho fixo e carregam sob demanda, para a lista não pular
 * (FP-R9); "lg" ocupa a largura do diálogo. O texto alternativo é sempre o nome do item (FP-R8).
 */
export function ItemPhoto({ photoKey, name, size = "sm" }: { photoKey: string; name: string; size?: "sm" | "md" | "lg" }) {
  const side = size === "lg" ? undefined : SIDE[size];
  return (
    <img
      className={`item-photo item-photo-${size}`}
      src={photoUrl(photoKey)}
      alt={`Foto de ${name}`}
      width={side}
      height={side}
      loading="lazy"
      decoding="async"
      data-testid="item-photo"
    />
  );
}
