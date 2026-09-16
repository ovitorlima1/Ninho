import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isUnauthorized } from "@/lib/errors";

function handleExpiredSession(client: QueryClient, error: unknown): void {
  if (!isUnauthorized(error)) return;
  const signInPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in?expirou=1`;
  if (window.location.pathname + window.location.search === signInPath) return;
  client.clear();
  window.location.assign(signInPath);
}

export const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 1,
    },
  },
  queryCache: new QueryCache({ onError: (error) => handleExpiredSession(queryClient, error) }),
  // Login e cadastro respondem 401 para senha errada: isso não é sessão expirada.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.authFlow) return;
      handleExpiredSession(queryClient, error);
    },
  }),
});
