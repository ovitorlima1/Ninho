import { QueryClientProvider } from "@tanstack/react-query";
import { Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { queryClient } from "@/app/query-client";
import { AppRouter } from "@/app/router";
import { basePath } from "@/lib/format";

function NinhoApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <NinhoApp />
    </WouterRouter>
  );
}
