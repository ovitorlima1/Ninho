/**
 * Marca do Ninho: o ninho que acolhe (gestante, ninho e coração) num quadrado creme.
 * O símbolo é um arquivo em public/ (cacheado), não embutido no JS; as cores dele são fixas.
 */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" data-testid="brand-ninho">
      <img className="brand-mark" src={`${import.meta.env.BASE_URL}ninho-icon.svg`} alt="" width={40} height={40} />
      <span className={compact ? "visually-hidden" : "brand-word"}>Ninho</span>
    </div>
  );
}
