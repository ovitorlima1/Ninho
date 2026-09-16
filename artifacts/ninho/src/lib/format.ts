export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export function initialsFor(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : parts[0]!.charAt(1);
  return `${first}${last}`.toUpperCase();
}
