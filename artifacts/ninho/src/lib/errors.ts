/**
 * Sessão expirada é tratada em um lugar só: sem isto, o 401 virava "verifique
 * sua conexão" e a tela ficava oferecendo "tentar novamente" para sempre.
 */
export function isUnauthorized(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "status" in error
    && Number((error as { status?: unknown }).status) === 401);
}

/**
 * Mensagem para a usuária. A API manda um texto pronto em pt-BR na maioria dos
 * casos; quando não manda, o status vira uma frase — nunca "HTTP 400 Bad
 * Request", que já apareceu na tela.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
      return data.error;
    }
  }
  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

  if (status === 401) return "Sua sessão expirou. Entre de novo para continuar.";
  if (status === 404) return "Não encontramos esse item. Atualize a página e tente de novo.";
  if (status === 409) return "Esse item já está na sua lista.";
  if (status === 429) return "Muitas tentativas seguidas. Aguarde alguns minutos.";
  if (status && status >= 500) return "Nosso servidor tropeçou. Tente de novo em instantes.";
  if (!status) return "Não conseguimos falar com o Ninho. Confira sua conexão.";
  return "Não foi possível concluir agora. Tente novamente.";
}

export const getAuthErrorMessage = getFriendlyErrorMessage;
