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
