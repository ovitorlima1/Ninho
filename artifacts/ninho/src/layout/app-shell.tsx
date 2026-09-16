import { useEffect, useRef, type ReactNode } from "react";
import { History, Home, ListChecks, UserRound, WalletCards } from "lucide-react";
import { Brand } from "@/components/brand";
import { type ServerProfile } from "@/lib/api";
import { initialsFor, todayLabel } from "@/lib/format";

export type NavPath = "/dashboard" | "/checklist" | "/milestones" | "/budget" | "/profile";

/**
 * Os cinco destinos do app. A mesma lista alimenta a barra inferior, a barra
 * lateral, o h1 e o título da aba — antes a mesma tela tinha até três nomes.
 */
export const NAV_ITEMS: { path: NavPath; label: string; icon: typeof Home; testId: string }[] = [
  { path: "/dashboard", label: "Início", icon: Home, testId: "inicio" },
  { path: "/checklist", label: "Lista", icon: ListChecks, testId: "lista" },
  { path: "/milestones", label: "Marcos", icon: History, testId: "marcos" },
  { path: "/budget", label: "Orçamento", icon: WalletCards, testId: "orcamento" },
  { path: "/profile", label: "Perfil", icon: UserRound, testId: "perfil" },
];

/** Inspirações mora dentro da Lista; rotas desconhecidas caem no Início. */
export function navPathFor(location: string): NavPath {
  if (location === "/recommendations") return "/checklist";
  return NAV_ITEMS.find((item) => item.path === location)?.path ?? "/dashboard";
}

export function NavLinks({ current, go, variant }: { current: NavPath; go: (path: string) => void; variant: "tabbar" | "sidebar" }) {
  return (
    <ul className={`nav-list nav-list-${variant}`}>
      {NAV_ITEMS.map(({ path, label, icon: Icon, testId }) => {
        const selected = current === path;
        return (
          <li key={path}>
            <a
              href={path}
              className={`nav-link ${selected ? "is-current" : ""}`}
              aria-current={selected ? "page" : undefined}
              onClick={(event) => {
                // Mantém abrir em nova aba com Ctrl/Cmd; o resto navega sem recarregar.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                go(path);
              }}
              data-testid={variant === "tabbar" ? `button-phone-tab-${testId}` : `button-sidebar-${testId}`}
            >
              <span className="nav-icon" aria-hidden><Icon size={20} strokeWidth={selected ? 2.2 : 1.7} /></span>
              <span>{label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Casca única: barra inferior abaixo de 900px, barra lateral a partir dela. */
export function AppShell({
  location, go, profile, children,
}: {
  location: string;
  go: (path: string) => void;
  profile: ServerProfile;
  children: ReactNode;
}) {
  const current = navPathFor(location);
  const currentLabel = NAV_ITEMS.find((item) => item.path === current)!.label;
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    document.title = `${location === "/recommendations" ? "Inspirações" : currentLabel} · Ninho`;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Ao trocar de tela, começa do topo e o leitor de tela é levado ao conteúdo novo.
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location, currentLabel]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <aside className="app-sidebar">
        <Brand />
        <nav aria-label="Navegação principal">
          <NavLinks current={current} go={go} variant="sidebar" />
        </nav>
        <p className="app-sidebar-note">Um passo de cada vez, sem pressa, sem excesso.</p>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <span className="app-header-brand"><Brand /></span>
          <div className="app-header-title">
            <span className="app-header-date">{todayLabel()}</span>
            <h1>{currentLabel}</h1>
          </div>
          <button
            type="button"
            className="app-avatar"
            onClick={() => go("/profile")}
            aria-label="Abrir perfil"
            data-testid="button-open-profile-avatar"
          >
            {initialsFor(profile.displayName)}
          </button>
        </header>
        <main id="conteudo" className="app-main" ref={mainRef} tabIndex={-1}>
          {children}
        </main>
      </div>
      <nav className="app-tabbar" aria-label="Navegação principal">
        <NavLinks current={current} go={go} variant="tabbar" />
      </nav>
    </div>
  );
}

/** Lista com duas abas: os itens e as inspirações que combinam com eles. */
export function ListScreen({ tab, onTab, children }: { tab: "itens" | "inspiracoes"; onTab: (tab: "itens" | "inspiracoes") => void; children: ReactNode }) {
  const tabs = [
    { id: "itens" as const, label: "Itens" },
    { id: "inspiracoes" as const, label: "Inspirações" },
  ];
  return (
    <div className="list-screen">
      <div className="segmented" role="tablist" aria-label="Seções da lista">
        {tabs.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            role="tab"
            id={`list-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="list-tabpanel"
            tabIndex={tab === id ? 0 : -1}
            className={`segmented-option ${tab === id ? "is-selected" : ""}`}
            onClick={() => onTab(id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next = id === "itens" ? "inspiracoes" : "itens";
                onTab(next);
                requestAnimationFrame(() => document.getElementById(`list-tab-${next}`)?.focus());
              }
            }}
            data-testid={`button-list-tab-${id}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="list-tabpanel" aria-labelledby={`list-tab-${tab}`}>
        {children}
      </div>
    </div>
  );
}
