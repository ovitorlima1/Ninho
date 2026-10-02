/**
 * Links de gerenciamento do convidado, guardados no aparelho. Sem conta: é com
 * eles que a pessoa revê o Pix ou cancela a reserva.
 */
const storageKey = (listToken: string) => `ninho:reservas:${listToken}`;
const MANAGE_TOKEN = /^[A-Za-z0-9_-]{40,128}$/;

export function readManageTokens(listToken: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(listToken)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && MANAGE_TOKEN.test(value)).slice(-20) : [];
  } catch {
    return [];
  }
}

export function addManageToken(listToken: string, manageToken: string): string[] {
  if (!MANAGE_TOKEN.test(manageToken)) return readManageTokens(listToken);
  const tokens = [...new Set([...readManageTokens(listToken), manageToken])].slice(-20);
  try {
    localStorage.setItem(storageKey(listToken), JSON.stringify(tokens));
  } catch {
    // Navegação privada sem armazenamento: a reserva vale, só não fica lembrada neste aparelho.
  }
  return tokens;
}

/**
 * O link particular traz o token no fragmento (#p=…), que não vai para o
 * servidor. Ao abrir, o token passa para o aparelho e sai da barra de endereço.
 */
export function adoptTokenFromHash(listToken: string): void {
  const match = window.location.hash.match(/^#p=([A-Za-z0-9_-]{40,128})$/);
  if (!match) return;
  addManageToken(listToken, match[1]!);
  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
}
