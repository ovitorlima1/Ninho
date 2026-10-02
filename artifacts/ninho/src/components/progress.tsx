/**
 * Fita métrica (PRD §4.1): o elemento de progresso do app inteiro. As marcações
 * de centímetro ficam no CSS; aqui só o valor e a semântica de progressbar.
 */
export function Progress({
  value, label, size = "md", tone = "accent", className = "",
}: {
  value: number;
  label: string;
  size?: "md" | "lg";
  tone?: "accent" | "brand";
  className?: string;
}) {
  const clamped = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div
      className={`tape tape-${size} tape-${tone} ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <span className="tape-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

/**
 * Barra em dois tons das listas de presentes: o que a mãe já recebeu (forte)
 * e o que está prometido (claro). O valor anunciado é a soma dos dois.
 */
export function SplitProgress({
  confirmed, committed, label, size = "md",
}: {
  /** Porcentagem já recebida. */
  confirmed: number;
  /** Porcentagem recebida + prometida. */
  committed: number;
  label: string;
  size?: "md" | "lg";
}) {
  const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div
      className={`tape tape-${size} tape-split`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamp(committed)}
    >
      <span className="tape-fill tape-fill-promised" style={{ width: `${clamp(committed)}%` }} />
      <span className="tape-fill" style={{ width: `${clamp(confirmed)}%` }} />
    </div>
  );
}
