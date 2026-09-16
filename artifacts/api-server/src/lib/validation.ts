/** Primeira mensagem de um erro do Zod — os schemas já trazem o texto em pt-BR. */
export function firstIssueMessage(error: { issues: ReadonlyArray<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Confira os dados informados.";
}
