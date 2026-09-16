import { lazy, Suspense, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { ErrorState, LoadingSpinner } from "@/components/states";
import { getSession } from "@/lib/api";
import NotFound from "@/pages/not-found";

// Cada área carrega o próprio código (M8): quem abre o link público de
// presentes não baixa o workspace, e a tela de login não baixa as telas logadas.
const AuthPage = lazy(() => import("@/features/auth/auth-page").then((m) => ({ default: m.AuthPage })));
const PasswordResetRequestPage = lazy(() =>
  import("@/features/auth/password-reset-pages").then((m) => ({ default: m.PasswordResetRequestPage })));
const PasswordResetPage = lazy(() =>
  import("@/features/auth/password-reset-pages").then((m) => ({ default: m.PasswordResetPage })));
const PublicGiftPage = lazy(() => import("@/features/gift/public-gift-page").then((m) => ({ default: m.PublicGiftPage })));
const WorkspacePage = lazy(() => import("@/features/workspace/workspace-page").then((m) => ({ default: m.WorkspacePage })));

function FullPageSpinner() {
  return (
    <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <LoadingSpinner />
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>;
}

export function AuthenticatedApp({ userId }: { userId: string }) {
  const [location] = useLocation();
  if (location === "/") return <Redirect to="/dashboard" />;
  return <Lazy><WorkspacePage userId={userId} /></Lazy>;
}

export function AppRouter() {
  const [location] = useLocation();
  const isPublicGiftRoute = location.startsWith("/gift/");
  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: getSession,
    staleTime: Infinity,
    retry: false,
  });

  if (!isPublicGiftRoute && sessionQuery.isPending) return <FullPageSpinner />;

  if (!isPublicGiftRoute && sessionQuery.isError) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <ErrorState message="Não foi possível verificar sua sessão." onRetry={() => sessionQuery.refetch()} />
      </div>
    );
  }

  if (isPublicGiftRoute) {
    return (
      <Switch>
        <Route path="/gift/:token"><Lazy><PublicGiftPage /></Lazy></Route>
        <Route><NotFound /></Route>
      </Switch>
    );
  }

  const user = sessionQuery.data?.user;
  const isAuthRoute = location === "/sign-in" || location === "/sign-up" || location === "/forgot-password";
  if (user && isAuthRoute) return <Redirect to="/dashboard" />;

  return (
    <Switch>
      <Route path="/sign-in"><Lazy><AuthPage mode="signin" /></Lazy></Route>
      <Route path="/sign-up"><Lazy><AuthPage mode="signup" /></Lazy></Route>
      <Route path="/forgot-password"><Lazy><PasswordResetRequestPage /></Lazy></Route>
      <Route path="/reset-password"><Lazy><PasswordResetPage /></Lazy></Route>
      <Route path="/"><Redirect to={user ? "/dashboard" : "/sign-in"} /></Route>
      {user ? (
        <Route path="/:rest*"><AuthenticatedApp userId={user.id} /></Route>
      ) : (
        <Route path="/:rest*"><Redirect to="/sign-in" /></Route>
      )}
    </Switch>
  );
}
