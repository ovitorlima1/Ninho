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

/** Inspirações e Presentes moram dentro da Lista; rotas desconhecidas caem no Início. */
export function navPathFor(location: string): NavPath {
  if (location === "/recommendations" || location === "/gifts" || location.startsWith("/gifts/")) return "/checklist";
  return NAV_ITEMS.find((item) => item.path === location)?.path ?? "/dashboard";
}

const TEST_ID_PREFIX = { tabbar: "button-phone-tab", rail: "button-rail", sidebar: "button-sidebar" } as const;

export function NavLinks({ current, go, variant }: { current: NavPath; go: (path: string) => void; variant: "tabbar" | "rail" | "sidebar" }) {
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
              data-testid={`${TEST_ID_PREFIX[variant]}-${testId}`}
            >
              <span className="nav-icon" aria-hidden><Icon size={20} strokeWidth={selected ? 2.2 : 1.75} /></span>
              {/* Na barra do celular só o item atual mostra o rótulo; os outros continuam com nome para leitor de tela. */}
              <span className={variant === "tabbar" && !selected ? "visually-hidden" : "nav-label"}>{label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Casca única por faixa do design system: barra flutuante no rodapé abaixo de 600px,
 * trilho de ícones de 600 a 1023px e barra lateral a partir de 1024px.
 */
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
    const title = location === "/recommendations" ? "Inspirações" : location.startsWith("/gifts") ? "Presentes" : currentLabel;
    document.title = `${title} · Ninho`;
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
      <aside className="app-rail">
        <Brand compact />
        <nav aria-label="Navegação principal">
          <NavLinks current={current} go={go} variant="rail" />
        </nav>
      </aside>
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

export type ListTab = "itens" | "presentes" | "inspiracoes";

/** Lista com três abas: o enxoval, as listas de presentes e as inspirações. */
export function ListScreen({ tab, onTab, children }: { tab: ListTab; onTab: (tab: ListTab) => void; children: ReactNode }) {
  const tabs = [
    { id: "itens" as const, label: "Enxoval" },
    { id: "presentes" as const, label: "Presentes" },
    { id: "inspiracoes" as const, label: "Inspirações" },
  ];
  return (
    <div className="list-screen">
      <div className="segmented" role="tablist" aria-label="Seções da lista">
        {tabs.map(({ id, label }, index) => (
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
                const step = event.key === "ArrowRight" ? 1 : tabs.length - 1;
                const next = tabs[(index + step) % tabs.length]!.id;
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
