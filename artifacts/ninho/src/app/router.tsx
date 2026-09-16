import { useQuery } from "@tanstack/react-query";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { ErrorState, LoadingSpinner } from "@/components/states";
import { getSession } from "@/lib/api";
import NotFound from "@/pages/not-found";
import { AuthPage } from "@/features/auth/auth-page";
import { PasswordResetPage, PasswordResetRequestPage } from "@/features/auth/password-reset-pages";
import { PublicGiftPage } from "@/features/gift/public-gift-page";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export function AuthenticatedApp({ userId }: { userId: string }) {
  const [location] = useLocation();
  if (location === "/") return <Redirect to="/dashboard" />;
  return <WorkspacePage userId={userId} />;
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

  if (!isPublicGiftRoute && sessionQuery.isPending) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <LoadingSpinner />
      </div>
    );
  }

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
        <Route path="/gift/:token"><PublicGiftPage /></Route>
        <Route><NotFound /></Route>
      </Switch>
    );
  }

  const user = sessionQuery.data?.user;
  const isAuthRoute = location === "/sign-in" || location === "/sign-up" || location === "/forgot-password";
  if (user && isAuthRoute) return <Redirect to="/dashboard" />;

  return (
    <Switch>
      <Route path="/sign-in"><AuthPage mode="signin" /></Route>
      <Route path="/sign-up"><AuthPage mode="signup" /></Route>
      <Route path="/forgot-password"><PasswordResetRequestPage /></Route>
      <Route path="/reset-password"><PasswordResetPage /></Route>
      <Route path="/"><Redirect to={user ? "/dashboard" : "/sign-in"} /></Route>
      {user ? (
        <Route path="/:rest*"><AuthenticatedApp userId={user.id} /></Route>
      ) : (
        <Route path="/:rest*"><Redirect to="/sign-in" /></Route>
      )}
    </Switch>
  );
}
