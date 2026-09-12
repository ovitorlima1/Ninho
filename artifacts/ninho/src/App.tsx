import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type MouseEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation, useRoute } from "wouter";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Gift,
  Heart,
  History,
  Home,
  Link2,
  ListChecks,
  LogOut,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Utensils,
  WalletCards,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  fetchWorkspace,
  updateProfile,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleMilestone,
  updateBudget,
  createGiftShare,
  deleteGiftReservation,
  fetchPublicGiftList,
  getGiftShare,
  reservePublicGift,
  revokeGiftShare,
  updateGiftReservation,
  type Workspace,
  type ServerChecklistItem,
  type ServerProfile,
  type ServerMilestone,
  type ServerBudgetCategory,
  type ServerGiftReservation,
  type ServerGiftShare,
  type PublicGiftItem,
  type GiftReservationStatus,
  type ItemStatus,
  type CategoryKey,
  type UpdateProfileInput,
  getSession,
  login,
  register,
  logout,
  requestPasswordReset,
  resetPassword,
  type AuthSession,
} from "@/lib/api";
import { calcSpent, calcSpentByCategory } from "@/lib/budget";
import {
  calcGestation,
  calcGestationalWeek,
  formatGestation,
  getDueDateBounds,
  validateDueDate,
} from "@/lib/gestation";
import {
  getNextRecommendationRefreshDelay,
  getRecommendationDisplayState,
  getVisibleRecommendations,
  isRecommendationVisible,
  type Recommendation,
} from "@/lib/recommendations";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChecklistItem = {
  id: number;
  name: string;
  category: CategoryKey;
  group: string;
  qty: number;
  status: ItemStatus;
  price: number;
  essential: boolean;
  recommendationId: string | null;
  giftReservation: ServerGiftReservation | null;
};

function adaptItem(s: ServerChecklistItem, giftReservation: ServerGiftReservation | null = null): ChecklistItem {
  return {
    id: s.id,
    name: s.name,
    category: s.category as CategoryKey,
    group: s.group,
    qty: s.qty,
    status: s.status as ItemStatus,
    price: parseFloat(s.price) || 0,
    essential: s.essential,
    recommendationId: s.recommendationId,
    giftReservation,
  };
}

type RecommendationFeedback = {
  tone: "success" | "error";
  message: string;
};

/** Opções de status na ordem em que a usuária pensa: a comprar → resolvido. */
const ITEM_STATUS_OPTIONS: { value: ItemStatus; label: string; short: string }[] = [
  { value: "A comprar", label: "A comprar", short: "a comprar" },
  { value: "Comprado", label: "Comprado", short: "comprei" },
  { value: "Ganhei", label: "Ganhei de presente", short: "ganhei" },
];

/** "6 un. × R$ 38,00 · R$ 228,00" — deixa explícito que o preço é unitário. */
function describeItemTotal(item: { qty: number; price: number; status: ItemStatus }): string {
  if (item.price <= 0) return `${item.qty} un.`;
  if (item.qty <= 1) return money(item.price);
  return `${item.qty} un. × ${money(item.price)} · ${money(item.price * item.qty)}`;
}

type ActionFeedback = RecommendationFeedback & {
  /** Ação opcional no aviso, usada pelo "Desfazer" da remoção. */
  action?: { label: string; onAction: () => void };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sessão expirada é tratada em um lugar só: sem isto, o 401 virava "verifique
 * sua conexão" e a tela ficava oferecendo "tentar novamente" para sempre.
 */
function isUnauthorized(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "status" in error
    && Number((error as { status?: unknown }).status) === 401);
}

function handleExpiredSession(client: QueryClient, error: unknown): void {
  if (!isUnauthorized(error)) return;
  const signInPath = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in?expirou=1`;
  if (window.location.pathname + window.location.search === signInPath) return;
  client.clear();
  window.location.assign(signInPath);
}

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 1,
    },
  },
  queryCache: new QueryCache({ onError: (error) => handleExpiredSession(queryClient, error) }),
  mutationCache: new MutationCache({ onError: (error) => handleExpiredSession(queryClient, error) }),
});
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const loginHeroImage = `${basePath}/login-pregnancy.png`;

const CATEGORIES: CategoryKey[] = ["Roupas", "Higiene", "Alimentação", "Acessórios"];
const GESTATION_WEEKS = Array.from({ length: 40 }, (_, index) => index + 1);

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const iconForCategory = (cat: CategoryKey) =>
  cat === "Alimentação" ? Utensils : cat === "Higiene" ? ClipboardCheck : cat === "Acessórios" ? Sparkles : Heart;

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function todayLabel(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function useRecommendationClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setTimeout(
      () => setNow(new Date()),
      getNextRecommendationRefreshDelay(now),
    );
    return () => window.clearTimeout(timer);
  }, [now]);

  return now;
}

// ─── Small UI primitives ──────────────────────────────────────────────────────

function Brand() {
  return (
    <div className="brand" data-testid="brand-ninho">
      <span className="brand-mark"><span /></span>
      <span className="brand-word">ninho</span>
    </div>
  );
}

function AccountControl({ onProfile }: { onProfile?: () => void }) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { data } = useQuery({ queryKey: ["auth-session"], queryFn: getSession, staleTime: Infinity });
  const name = data?.user?.email.split("@")[0] || "Você";
  const initials = name.slice(0, 2).toUpperCase();
  const handleSignOut = async () => {
    // Clear all cached workspace data before redirecting so the next user
    // that signs in on this device cannot see stale data from this session.
    try {
      await logout();
    } finally {
      qc.clear();
      setLocation("/sign-in");
    }
  };
  const handleProfile = () => {
    if (onProfile) {
      onProfile();
      return;
    }
    setLocation("/profile");
  };
  return (
    <div className="account-control">
      <button
        type="button"
        className="toolbar-avatar toolbar-avatar-button"
        onClick={handleProfile}
        aria-label="Abrir Meu perfil"
        title="Meu perfil"
        data-testid="button-open-profile-avatar"
      >
        {initials}
      </button>
      <button type="button" onClick={handleSignOut} className="account-signout" data-testid="button-sign-out">
        <LogOut size={14} /> sair
      </button>
    </div>
  );
}

function TinyButton({ children, onClick, label, testId }: { children: ReactNode; onClick: () => void; label?: string; testId: string }) {
  return <button type="button" className="icon-button" onClick={onClick} aria-label={label} data-testid={testId}>{children}</button>;
}

function PasswordField({
  value,
  onChange,
  autoComplete,
  autoFocus,
  placeholder,
  testId,
  toggleTestId,
  id,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
  placeholder: string;
  testId: string;
  toggleTestId: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => {
    const input = inputRef.current;
    const selectionStart = input?.selectionStart;
    setVisible((current) => !current);
    requestAnimationFrame(() => {
      const nextInput = inputRef.current;
      if (!nextInput) return;
      nextInput.focus();
      if (selectionStart !== null && selectionStart !== undefined) {
        nextInput.setSelectionRange(selectionStart, selectionStart);
      }
    });
  };

  return (
    <span className="auth-password-wrap">
      <input
        ref={inputRef}
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
      <button
        type="button"
        className="auth-password-toggle"
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleVisibility}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        title={visible ? "Ocultar senha" : "Mostrar senha"}
        data-testid={toggleTestId}
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </span>
  );
}

function Pill({ active, children, onClick, testId }: { active?: boolean; children: ReactNode; onClick?: () => void; testId: string }) {
  return <button type="button" className={`pill ${active ? "pill-active" : ""}`} onClick={onClick} data-testid={testId}>{children}</button>;
}

function Progress({ value, className = "" }: { value: number; className?: string }) {
  return <div className={`progress-line ${className}`}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

function ActionFeedbackBanner({ feedback, onDismiss }: { feedback: ActionFeedback | null; onDismiss: () => void }) {
  if (!feedback) return null;
  return (
    <div className={`action-feedback action-feedback-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
      {feedback.tone === "success" ? <CheckCircle2 size={15} /> : <X size={15} />}
      <span>{feedback.message}</span>
      {feedback.action && (
        <button
          type="button"
          className="action-feedback-action"
          onClick={() => { feedback.action?.onAction(); onDismiss(); }}
          data-testid="button-action-feedback-action"
        >
          {feedback.action.label}
        </button>
      )}
      <button type="button" onClick={onDismiss} aria-label="Fechar mensagem" data-testid="button-dismiss-action-feedback"><X size={13} /></button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p>Carregando seu ninho…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <p>{message}</p>
      {onRetry && <button type="button" className="primary-button" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Casca comum de todos os diálogos: semântica de dialog, foco inicial, foco
 * preso, Esc para fechar e devolução do foco a quem abriu. Quando recebe
 * `onSubmit`, o próprio cartão vira <form>, então Enter envia — e os seletores
 * `.modal-card > p` do CSS continuam valendo.
 */
function ModalShell({
  labelledBy,
  describedBy,
  className = "",
  onClose,
  onSubmit,
  dismissible = true,
  focusKey,
  initialFocusRef,
  children,
}: {
  labelledBy: string;
  describedBy?: string;
  className?: string;
  onClose: () => void;
  onSubmit?: () => void;
  /** O onboarding não pode ser dispensado: não há para onde voltar. */
  dismissible?: boolean;
  /** Muda quando o conteúdo troca (ex.: passo do onboarding) para refocar. */
  focusKey?: string | number;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement | HTMLFormElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const target =
      initialFocusRef?.current
      ?? dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])')
      ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    target?.focus();
    return () => previousFocus?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, dismissible]);

  const cardProps = {
    className: `modal-card ${className}`.trim(),
    role: "dialog",
    "aria-modal": true as const,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    onClick: (event: MouseEvent<HTMLElement>) => event.stopPropagation(),
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={dismissible ? onClose : undefined}>
      {onSubmit ? (
        <form
          {...cardProps}
          ref={dialogRef as RefObject<HTMLFormElement>}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
        </form>
      ) : (
        <div {...cardProps} ref={dialogRef as RefObject<HTMLDivElement>}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Onboarding Modal ─────────────────────────────────────────────────────────

function OnboardingModal({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dueDate, setDueDateVal] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { displayName?: string; dueDate?: string | null; onboardingComplete: boolean }) =>
      updateProfile(data),
    onSuccess: (profile) => {
      qc.setQueryData<Workspace>(["workspace", userId], (old) => old ? { ...old, profile } : old);
      onComplete();
    },
  });

  const bounds = getDueDateBounds();

  /** Salva com a data; sem data válida a mensagem explica em vez de ignorar. */
  const finish = () => {
    if (!dueDate) {
      setDateError("Escolha a data prevista ou toque em “configurar depois”.");
      return;
    }
    const problem = validateDueDate(dueDate);
    if (problem) {
      setDateError(problem);
      return;
    }
    setDateError(null);
    save(dueDate);
  };

  const save = (date: string | null) => {
    mutation.mutate({
      displayName: name.trim() || undefined,
      dueDate: date,
      onboardingComplete: true,
    });
  };

  return (
    <ModalShell
      className="onboarding-card"
      labelledBy={`onboarding-step-${step}-title`}
      describedBy={`onboarding-step-${step}-description`}
      onClose={() => undefined}
      onSubmit={() => (step === 1 ? setStep(2) : finish())}
      dismissible={false}
      focusKey={step}
    >
      <>
        <div className="onboarding-progress">
          <span className={step >= 1 ? "step-active" : ""} />
          <span className={step >= 2 ? "step-active" : ""} />
        </div>

        {step === 1 && (
          <>
            <div className="modal-top">
              <div className="onboarding-intro"><span className="card-kicker">BEM-VINDA</span><h2 id="onboarding-step-1-title">Como posso te chamar?</h2></div>
            </div>
            <p className="muted-copy onboarding-description" id="onboarding-step-1-description">Pode ser seu nome, um apelido ou como você gosta de ser chamada.</p>
            <label className="modal-label">
              NOME OU APELIDO
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: Ana, Duda, Mãe da Lara…"
                data-testid="input-onboarding-name"
              />
            </label>
            <div className="onboarding-actions">
              <button type="submit" className="primary-button" data-testid="button-onboarding-next">
                Continuar <ChevronRight size={15} />
              </button>
              <button type="button" className="text-action" onClick={() => setStep(2)} data-testid="button-onboarding-skip-name">
                pular por agora
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="modal-top">
              <div className="onboarding-intro"><span className="card-kicker">CHEGADA</span><h2 id="onboarding-step-2-title">Qual é a data prevista?</h2></div>
              <TinyButton onClick={() => setStep(1)} label="Voltar" testId="button-onboarding-back"><ChevronRight size={17} className="rotate-180" /></TinyButton>
            </div>
            <p className="muted-copy onboarding-description" id="onboarding-step-2-description">A partir dela, calculamos sua semana e os marcos. Você pode mudar depois.</p>
            <label className="modal-label">
              DATA PREVISTA
              <input
                type="date"
                value={dueDate}
                min={bounds.min}
                max={bounds.max}
                aria-invalid={dateError ? true : undefined}
                aria-describedby={dateError ? "onboarding-due-date-error" : undefined}
                onChange={(e) => { setDueDateVal(e.target.value); setDateError(null); }}
                className="date-input"
                data-testid="input-onboarding-due-date"
              />
            </label>
            {dateError && <p className="field-error" role="alert" id="onboarding-due-date-error">{dateError}</p>}
            {mutation.isError && <p className="field-error" role="alert">{getFriendlyErrorMessage(mutation.error)}</p>}
            <div className="onboarding-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={mutation.isPending}
                data-testid="button-onboarding-finish"
              >
                {mutation.isPending ? "Salvando…" : "Entrar no meu ninho"}
              </button>
              <button type="button" className="text-action" onClick={() => save(null)} disabled={mutation.isPending} data-testid="button-onboarding-skip-date">
                configurar depois
              </button>
            </div>
          </>
        )}
      </>
    </ModalShell>
  );
}

// ─── Phone shell ──────────────────────────────────────────────────────────────

function Phone({ children, title, activeRoute, setLocation, activePanel, onPanel }: {
  children: ReactNode; title: string; activeRoute: string;
  setLocation: (path: string) => void; activePanel: number; onPanel: (index: number) => void;
}) {
  const tabs = [
    { path: "/dashboard", label: "Início", testId: "inicio", icon: Home, panel: 0 },
    { path: "/checklist", label: "Lista", testId: "lista", icon: ListChecks, panel: 1 },
    { path: "/milestones", label: "Marcos", testId: "marcos", icon: History, panel: 2 },
    { path: "/recommendations", label: "Inspirações", testId: "inspiracoes", icon: Sparkles, panel: 0 },
  ];
  const panelIdx = title === "Ninho" ? 0 : title === "Registro rápido" ? 1 : 2;
  return (
    <section className={`phone phone-${panelIdx} ${activePanel === panelIdx ? "is-mobile-active" : ""}`} aria-label={title}>
      <div className="phone-screen">
        {children}
        <nav className="phone-tabs" aria-label="Navegação do Ninho">
          {tabs.map(({ path, label, testId, icon: Icon, panel }) => {
            const selected = activeRoute === path;
            return (
              <button type="button" key={path} onClick={() => { onPanel(panel); setLocation(path); }} className={`phone-tab ${selected ? "tab-active" : ""}`} aria-current={selected ? "page" : undefined} data-testid={`button-phone-tab-${testId}`}>
                <Icon size={16} strokeWidth={selected ? 2 : 1.5} /><span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}

function MobileUtilityLinks({ location, onBudget, onProfile }: { location: string; onBudget: () => void; onProfile: () => void }) {
  return (
    <div className="mobile-utility-links" aria-label="Atalhos de organização">
      <button
        type="button"
        className={`mobile-budget-link ${location === "/budget" ? "is-current" : ""}`}
        onClick={onBudget}
        aria-current={location === "/budget" ? "page" : undefined}
        data-testid="button-mobile-nav-orcamento"
      >
        <WalletCards size={14} /><span>Orçamento</span>
      </button>
      <button
        type="button"
        className={`mobile-budget-link ${location === "/profile" ? "is-current" : ""}`}
        onClick={onProfile}
        aria-current={location === "/profile" ? "page" : undefined}
        data-testid="button-mobile-nav-perfil"
      >
        <UserRound size={14} /><span>Perfil</span>
      </button>
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────

/**
 * O primeiro marco pendente, mesmo que a semana dele já tenha passado: pular
 * atrasados escondia justamente o que precisa de atenção.
 */
function getNextMilestone(miles: ServerMilestone[], _week: number | null): ServerMilestone | undefined {
  return miles
    .filter((milestone) => !milestone.completed)
    .slice()
    .sort((first, second) => first.week - second.week)[0];
}

function OverviewPanel({
  items, profile, milestones: miles, budget, setLocation,
}: {
  items: ChecklistItem[];
  profile: ServerProfile;
  milestones: ServerMilestone[];
  budget: ServerBudgetCategory[];
  setLocation: (path: string) => void;
}) {
  const done = items.filter((i) => i.status !== "A comprar").length;
  const score = items.length ? Math.round((done / items.length) * 100) : 0;
  const name = profile.displayName || "você";
  const week = calcGestationalWeek(profile.dueDate);
  const spent = calcSpent(items);
  const totalPlanned = budget.reduce((s, b) => s + parseFloat(b.planned), 0);
  const nextMilestone = getNextMilestone(miles, week);
  const focusCategory = items.filter((i) => i.category === "Roupas" && i.essential);
  const focusDone = focusCategory.filter((i) => i.status !== "A comprar").length;

  return (
    <div className="phone-content flow">
      <div className="eyebrow-row"><span>{todayLabel()}</span><span className="live-dot" /></div>
      <h1 className="phone-heading">Seu caminho,<br /><strong>um passo de cada vez.</strong></h1>
      <div className="focus-card">
        <div className="focus-copy">
          <span className="card-kicker">PREPARAÇÃO</span>
          <strong>{score}%</strong>
          <span>do enxoval já tomou forma</span>
          <Progress value={score} />
        </div>
        <div className="orbit-illustration" aria-label="Referência de quarto do bebê">
          <img src={`${import.meta.env.BASE_URL}images/quarto-bebe.jpg`} alt="Quarto de bebê claro e acolhedor" />
          <i /><b />
          <em><span>{done}</span><small>de {items.length}</small></em>
        </div>
      </div>
      <div className="section-line"><span>Visão geral</span><button type="button" onClick={() => setLocation("/checklist")} data-testid="button-open-overview-list">ver lista <ChevronRight size={13} /></button></div>
      {focusCategory.length > 0 && (
        <div className="white-card">
          <div className="card-head"><div><span className="card-kicker">FOCO DA SEMANA</span><h2>Roupas essenciais</h2></div><div className="round-icon"><Heart size={15} /></div></div>
          <p className="muted-copy">Peças macias para os primeiros dias, sem excesso.</p>
          <div className="mini-stat">
            <span><CheckCircle2 size={14} /> {focusDone} de {focusCategory.length} resolvidos</span>
            <span>{focusCategory.length ? Math.round((focusDone / focusCategory.length) * 100) : 0}%</span>
          </div>
          <Progress value={focusCategory.length ? (focusDone / focusCategory.length) * 100 : 0} />
        </div>
      )}
      <div className="two-stat-grid">
        <button type="button" className="white-card compact-card" onClick={() => setLocation("/milestones")} data-testid="button-open-overview-milestones">
          <span className="card-kicker">PRÓXIMO MARCO</span>
          {nextMilestone ? <><strong>Semana {nextMilestone.week}</strong><span className="muted-copy">{nextMilestone.title}</span></> : <><strong>—</strong><span className="muted-copy">{week ? "todos concluídos" : "configure a data prevista"}</span></>}
          <ChevronRight size={14} />
        </button>
        <button type="button" className="white-card compact-card" onClick={() => setLocation("/budget")} data-testid="button-open-overview-budget">
          <span className="card-kicker">ORÇAMENTO</span>
          <strong>{money(spent)}</strong>
          <span className="muted-copy">investido até aqui</span>
          <ChevronRight size={14} />
        </button>
      </div>
      <button type="button" className="soft-action recommendation-prompt" onClick={() => setLocation("/recommendations")} data-testid="button-open-recommendations">
        <Sparkles size={15} />
        <span><strong>inspirações para o seu momento</strong><small>uma seleção leve para complementar sua lista</small></span>
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}

function ChecklistPanel({
  items, onToggle, onAdd, onEdit, onDelete, onOpenRecommendation, onUnlinkRecommendation,
  onReleaseGiftReservation, onUpdateGiftReservation, pendingItemId, isActionPending,
}: {
  items: ChecklistItem[];
  onToggle: (id: number, status: ItemStatus) => void;
  onAdd: (category: CategoryKey) => void;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (id: number) => void;
  onOpenRecommendation: (id: string) => void;
  onUnlinkRecommendation: (id: number) => void;
  onReleaseGiftReservation: (reservationId: number) => void;
  onUpdateGiftReservation: (reservationId: number, status: GiftReservationStatus) => void;
  /** Só a linha que está gravando fica travada; o resto da lista continua viva. */
  pendingItemId: number | null;
  isActionPending: boolean;
}) {
  const [category, setCategory] = useState<CategoryKey>("Roupas");
  const visible = items.filter((i) => i.category === category);
  const allDone = items.filter((i) => i.status !== "A comprar").length;

  return (
    <div className="phone-content flow">
      <div className="eyebrow-row"><span>LISTA DE PREPARO</span><span className="count-badge">{allDone}/{items.length}</span></div>
      <h1 className="phone-heading">Tudo no lugar,<br /><strong>na hora certa.</strong></h1>
      <div className="filter-row">
        {CATEGORIES.map((key) => (
          <Pill key={key} active={category === key} onClick={() => setCategory(key)} testId={`button-phone-category-${key.toLowerCase()}`}>{key}</Pill>
        ))}
      </div>
      <div className="activity-card">
        <div className="card-head">
          <div><span className="card-kicker">CHECKLIST ATIVO</span><h2>{category}</h2></div>
          <TinyButton onClick={() => onAdd(category)} label="Adicionar item" testId="button-phone-add-item"><Plus size={16} /></TinyButton>
        </div>
        <div className="check-list" aria-busy={isActionPending}>
          {visible.length === 0 && (
            <div className="empty-category">
              <p>Nenhum item em {category} ainda.</p>
              <button type="button" className="text-action" onClick={() => onAdd(category)} data-testid="button-phone-add-category-item">
                <Plus size={13} /> adicionar primeiro item
              </button>
            </div>
          )}
          {visible.map((item) => (
            <div className={`check-item-row ${pendingItemId === item.id ? "is-saving" : ""}`} key={item.id}>
              <button
                type="button"
                className="check-item"
                onClick={() => onEdit(item)}
                disabled={pendingItemId === item.id}
                data-testid={`button-phone-check-${item.id}`}
              >
                <span className={`check-circle ${item.status !== "A comprar" ? "checked" : ""}`} aria-hidden>
                  {item.status === "Comprado" && <Check size={12} />}
                  {item.status === "Ganhei" && <Heart size={10} />}
                </span>
                <span className="check-name">
                  <strong>{item.name}</strong>
                  <small>{describeItemTotal(item)}</small>
                  {item.giftReservation && (
                    <span className="gift-reservation-owner">
                      <Gift size={11} />
                      {item.giftReservation.guestName || "Alguém"} {item.giftReservation.status}
                    </span>
                  )}
                </span>
                <span className="check-item-edit-hint" aria-hidden><Pencil size={13} /></span>
              </button>
              <div
                className="status-picker"
                role="radiogroup"
                aria-label={`Status de ${item.name}`}
              >
                {ITEM_STATUS_OPTIONS.map(({ value, label, short }) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={item.status === value}
                    className={`status-option ${item.status === value ? "selected" : ""}`}
                    onClick={() => item.status !== value && onToggle(item.id, value)}
                    disabled={pendingItemId === item.id}
                    title={label}
                    data-testid={`button-item-status-${item.id}-${value.replace(/\s/g, "-")}`}
                  >
                    {short}
                  </button>
                ))}
              </div>
                {item.recommendationId && (
                  <div className="check-recommendation-actions">
                    {isRecommendationVisible(item.recommendationId) ? (
                      <button
                        type="button"
                        className="check-recommendation-link"
                        onClick={() => onOpenRecommendation(item.recommendationId!)}
                        data-testid={`button-open-item-recommendation-${item.id}`}
                      >
                        <Sparkles size={10} /> ver inspiração
                      </button>
                    ) : (
                        <span className="check-recommendation-unavailable">inspiração indisponível</span>
                    )}
                    <button
                      type="button"
                      className="check-recommendation-unlink"
                      onClick={() => onUnlinkRecommendation(item.id)}
                      disabled={pendingItemId === item.id}
                      data-testid={`button-unlink-recommendation-${item.id}`}
                    >
                      desvincular
                    </button>
                  </div>
                )}
              {item.giftReservation && (
                <span className="gift-reservation-actions">
                  <button
                    type="button"
                    className="gift-reservation-status"
                    disabled={pendingItemId === item.id}
                    onClick={() => onUpdateGiftReservation(
                      item.giftReservation!.id,
                      item.giftReservation!.status === "vou presentear" ? "presenteado" : "vou presentear",
                    )}
                    data-testid={`button-gift-reservation-status-${item.id}`}
                  >
                    {item.giftReservation.status === "vou presentear" ? "marcar presenteado" : "marcar reservado"}
                  </button>
                  <button
                    type="button"
                    className="gift-reservation-release"
                    onClick={() => onReleaseGiftReservation(item.giftReservation!.id)}
                    disabled={pendingItemId === item.id}
                    data-testid={`button-gift-reservation-release-${item.id}`}
                  >
                    desfazer
                  </button>
                </span>
              )}
              <button type="button" className="delete-item-btn" onClick={() => onDelete(item.id)} disabled={pendingItemId === item.id} aria-label={`Remover ${item.name}`} data-testid={`button-phone-delete-${item.id}`}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="text-action" onClick={() => onAdd(category)} data-testid="button-phone-add-list-item">
          <Plus size={13} /> adicionar item
        </button>
      </div>
      <div className="log-card">
        <div className="log-title"><Activity size={15} /> seu progresso</div>
        <div className="log-row"><span className="log-dot" /><span>{allDone} de {items.length} itens resolvidos</span></div>
        {items.filter((i) => i.status !== "A comprar").slice(-1).map((i) => (
          <div className="log-row" key={i.id}><span className="log-dot dim" /><span>{i.name} marcado como {i.status.toLowerCase()}</span></div>
        ))}
      </div>
    </div>
  );
}

/** Depois da data prevista o app não sabe se o bebê nasceu — então pergunta. */
function ArrivalNotice() {
  const [, setLocation] = useLocation();
  return (
    <div className="arrival-notice" role="status">
      <Heart size={15} aria-hidden />
      <div>
        <strong>A chegada pode ser a qualquer momento.</strong>
        <p>Se o bebê já nasceu, você pode ajustar a data no seu perfil.</p>
      </div>
      <button type="button" className="text-action" onClick={() => setLocation("/profile")} data-testid="button-arrival-notice-profile">
        abrir perfil
      </button>
    </div>
  );
}

function TimelinePanel({
  milestones: miles, profile, onToggle, isActionPending,
}: {
  milestones: ServerMilestone[];
  profile: ServerProfile;
  onToggle: (id: number, completed: boolean) => void;
  isActionPending: boolean;
}) {
  const gestation = calcGestation(profile.dueDate);
  const week = gestation?.week ?? null;
  const name = profile.displayName || "você";
  const displayWeek = week;
  const progress = displayWeek ? Math.round((displayWeek / 40) * 100) : 0;
  const trackProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="phone-content flow timeline-panel">
      <div className="eyebrow-row">
        <span>{week ? `JORNADA DE ${name.toUpperCase()}` : "LINHA DO TEMPO"}</span>
        <span>{week ? `${displayWeek} / 40` : "—"}</span>
      </div>
      <h1 className="phone-heading">Os próximos<br /><strong>pequenos marcos.</strong></h1>

      {gestation?.isOverdue && <ArrivalNotice />}

      {!profile.dueDate ? (
        <div className="empty-timeline">
          <CalendarDays size={28} />
          <p>Configure a data prevista no seu perfil para ver a linha do tempo personalizada.</p>
        </div>
      ) : (
        <div className="timeline-chart">
          <div className="chart-top"><span>PROGRESSO DA GESTAÇÃO</span><strong>{progress}%</strong></div>
          <div className="gestation-visual" role="img" aria-label={`Semana ${displayWeek} de 40, ${progress}% da gestação concluída`}>
            <div className="gestation-scale">
              <div className="gestation-rail">
                <span className="gestation-rail-fill" style={{ width: `${trackProgress}%` }} />
                <span className="gestation-current" style={{ left: `${trackProgress}%` }}>
                  <b>{displayWeek}</b>
                </span>
              </div>
              <div className="gestation-ticks" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="chart-foot">
            <span>sem 1</span>
            <span>agora · sem {displayWeek}</span>
            <span>sem 40 · parto</span>
          </div>
        </div>
      )}

      {week && (
        <div className="week-overview">
          <div className="week-overview-top">
            <span>JORNADA DE 40 SEMANAS</span>
            <strong>{gestation ? formatGestation(gestation) : ""}</strong>
          </div>
          <ol className="week-grid" aria-label="Semanas da gestação">
            {GESTATION_WEEKS.map((weekNumber) => {
              const isCurrent = weekNumber === displayWeek;
              const isPast = weekNumber < (displayWeek ?? 0);
              return (
                <li
                  key={weekNumber}
                  className={`week-marker ${isPast ? "is-past" : ""} ${isCurrent ? "is-current" : ""}`}
                  aria-label={`Semana ${weekNumber}${isCurrent ? ", semana atual" : isPast ? ", concluída" : ""}`}
                >
                  <span>{weekNumber}</span>
                </li>
              );
            })}
          </ol>
          <div className="week-overview-foot"><span>1º trimestre</span><span>2º trimestre</span><span>3º trimestre</span></div>
        </div>
      )}

      <div className="section-line"><span>Sua linha do tempo</span></div>
      <div className="milestone-list">
        {miles.map((m) => {
          const Icon = m.week <= 20 ? Sparkles : m.week <= 28 ? ClipboardCheck : m.week <= 32 ? Gift : Heart;
          const past = week !== null && m.week < (week ?? 0);
            const current = week !== null && m.week === week;
            // Atrasado é diferente de concluído: antes ficava esmaecido, com
            // cara de resolvido.
            const late = past && !m.completed;
            const state = m.completed ? "completed" : late ? "late" : current ? "current" : "future";
          return (
            <button
              type="button"
                className={`milestone-item milestone-${state} ${m.completed ? "milestone-done" : ""}`}
              key={m.id}
              onClick={() => onToggle(m.id, !m.completed)}
                disabled={isActionPending}
                aria-pressed={m.completed}
                aria-current={current ? "step" : undefined}
                aria-label={`${m.title}, semana ${m.week}. ${m.completed ? "Concluído. Toque para marcar como pendente." : late ? "Atrasado e pendente. Toque para marcar como concluído." : "Pendente. Toque para marcar como concluído."}`}
              data-testid={`button-phone-milestone-${m.week}`}
            >
              <span className="milestone-icon"><Icon size={14} /></span>
              <span className="milestone-text">
                <small>SEMANA {m.week} · {late ? "atrasado" : m.note}</small>
                <strong>{m.title}</strong>
              </span>
              {m.completed ? <CheckCircle2 size={16} /> : <ChevronRight size={15} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BudgetPanel({
  items, budget, onSave, onEdit, saveState,
}: {
  items: ChecklistItem[];
  budget: ServerBudgetCategory[];
  onSave: (categories: Array<{ category: string; planned: number }>) => void;
  onEdit: () => void;
  saveState: "idle" | "saving" | "success" | "error";
}) {
  const [planned, setPlanned] = useState<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    for (const b of budget) r[b.category] = parseFloat(b.planned) || 0;
    return r;
  });
  const [dirty, setDirty] = useState(false);

  // Sync when budget prop changes (after mutations)
  useEffect(() => {
    const r: Record<string, number> = {};
    for (const b of budget) r[b.category] = parseFloat(b.planned) || 0;
    setPlanned(r);
    setDirty(false);
  }, [budget]);

  const spent = calcSpent(items);
  const total = Object.values(planned).reduce((s, v) => s + v, 0);

  const handleChange = (cat: string, val: number) => {
    setPlanned((p) => ({ ...p, [cat]: val }));
    setDirty(true);
    onEdit();
  };

  const save = () => {
    onSave(CATEGORIES.map((c) => ({ category: c, planned: planned[c] || 0 })));
  };

  return (
    <div className="phone-content flow">
      <div className="eyebrow-row"><span>CLAREZA SEM PLANILHA</span><WalletCards size={14} /></div>
      <h1 className="phone-heading">Um olhar calmo<br /><strong>para o orçamento.</strong></h1>
      <div className="budget-total">
        <span className="card-kicker">INVESTIDO ATÉ AQUI</span>
        <strong>{money(spent)}</strong>
        <small>de {money(total)} planejados</small>
        <Progress value={total > 0 ? (spent / total) * 100 : 0} />
      </div>
      <div className="white-card budget-list" aria-busy={saveState === "saving"} data-testid="budget-edit-card">
        <div className="card-head"><h2>Por categoria</h2><span className="card-kicker">EDITÁVEL</span></div>
        {CATEGORIES.map((cat) => {
          const spentHere = calcSpentByCategory(items, cat);
          const plannedHere = planned[cat] ?? 0;
          return (
            <label className="budget-row" key={cat}>
              <span className="budget-row-label">
                {cat}
                <small>{money(spentHere)} de {money(plannedHere)}</small>
                <Progress value={plannedHere > 0 ? (spentHere / plannedHere) * 100 : 0} />
              </span>
              <span className="price-input budget-price-input">
                <span aria-hidden>R$</span>
                <input
                  inputMode="decimal"
                  value={formatPriceInput(plannedHere)}
                  aria-label={`Orçamento planejado para ${cat}, em reais`}
                  onChange={(e) => {
                    const parsed = parsePriceInput(e.target.value);
                    if (parsed !== null) handleChange(cat, parsed);
                  }}
                  disabled={saveState === "saving"}
                  placeholder="0,00"
                  data-testid={`input-phone-budget-${cat.toLowerCase()}`}
                />
              </span>
            </label>
          );
        })}
        {saveState === "success" && !dirty && (
          <div className="budget-save-message budget-save-success" role="status">
            <CheckCircle2 size={14} /> Orçamento salvo.
          </div>
        )}
        {saveState === "error" && (
          <div className="budget-save-message budget-save-error" role="alert">
            Não foi possível salvar. Seus valores continuam aqui para tentar novamente.
          </div>
        )}
        {dirty && (
          <button type="button" className="primary-button" style={{ marginTop: 12 }} onClick={save} disabled={saveState === "saving"} data-testid="button-save-budget">
            {saveState === "saving" ? "salvando…" : <><Check size={14} /> salvar orçamento</>}
          </button>
        )}
      </div>
      <div className="log-card"><Pencil size={14} /> valores são uma bússola, não uma regra.</div>
    </div>
  );
}

/** Confirmação para ações que quebram algo que já foi compartilhado. */
function ConfirmDialog({
  title, description, confirmLabel, onConfirm, onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell labelledBy="confirm-dialog-title" onClose={onClose} onSubmit={() => { onConfirm(); onClose(); }}>
      <>
        <div className="modal-top">
          <div><span className="card-kicker">CONFIRMAR</span><h2 id="confirm-dialog-title">{title}</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-confirm"><X size={17} /></TinyButton>
        </div>
        <p>{description}</p>
        <button type="submit" className="primary-button" data-testid="button-confirm-action">{confirmLabel}</button>
        <button type="button" className="text-action confirm-cancel" onClick={onClose} data-testid="button-cancel-action">cancelar</button>
      </>
    </ModalShell>
  );
}

function GiftShareCard({
  share, onCreate, onRevoke, isLoading, error,
}: {
  share: ServerGiftShare | null | undefined;
  onCreate: () => void;
  onRevoke: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<"regenerate" | "revoke" | null>(null);
  const [copyError, setCopyError] = useState(false);
  const link = share ? `${window.location.origin}${basePath}/gift/${share.token}` : "";

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const field = document.createElement("textarea");
        field.value = link;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copiedWithFallback = document.execCommand("copy");
        field.remove();
        if (!copiedWithFallback) throw new Error("Clipboard unavailable");
      }
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <section className="gift-share-card" aria-labelledby="gift-share-title">
      <div className="gift-share-icon"><Gift size={18} /></div>
      <div className="gift-share-copy">
        <span className="card-kicker">LISTA PARA PRESENTES</span>
        <h2 id="gift-share-title">Deixe quem ama vocês participar.</h2>
        <p>Compartilhe só os itens do enxoval. Seus dados pessoais e orçamento ficam no seu ninho.</p>
      </div>
      {share ? (
        <>
          <div className="gift-share-link" aria-label="Link público da sua lista">
            <Link2 size={14} /><span>{link}</span>
          </div>
          <div className="gift-share-actions">
            <button type="button" className="primary-button gift-share-primary" onClick={copyLink} disabled={isLoading} data-testid="button-copy-gift-link">
              {copied ? <><Check size={15} /> link copiado</> : <><Copy size={15} /> copiar link</>}
            </button>
            <button type="button" className="gift-share-secondary" onClick={() => setConfirming("regenerate")} disabled={isLoading} data-testid="button-regenerate-gift-link">
              <RefreshCw size={14} /> gerar novo
            </button>
            <button type="button" className="gift-share-revoke" onClick={() => setConfirming("revoke")} disabled={isLoading} data-testid="button-revoke-gift-link">
              revogar link
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="primary-button gift-share-primary gift-share-create" onClick={onCreate} disabled={isLoading} data-testid="button-create-gift-link">
          <Gift size={15} /> {isLoading ? "criando link…" : "criar link para presentes"}
        </button>
      )}
      {copyError && <p className="gift-share-error" role="alert">Não foi possível copiar automaticamente. Selecione o endereço acima e copie manualmente.</p>}
      {error && <p className="gift-share-error" role="alert">{error}</p>}
      {confirming === "regenerate" && (
        <ConfirmDialog
          title="Gerar um link novo?"
          description="O link atual para de funcionar na hora. Quem já recebeu o antigo vai precisar do novo endereço."
          confirmLabel="gerar link novo"
          onConfirm={onCreate}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming === "revoke" && (
        <ConfirmDialog
          title="Revogar o link?"
          description="A lista sai do ar para todo mundo que tem o endereço. As reservas já feitas continuam salvas no seu ninho."
          confirmLabel="revogar link"
          onConfirm={onRevoke}
          onClose={() => setConfirming(null)}
        />
      )}
    </section>
  );
}
function ProfilePanel({
  profile, onSave, saveState, saveError, share, onCreateShare, onRevokeShare, shareLoading, shareError,
}: {
  profile: ServerProfile;
  onSave: (data: UpdateProfileInput) => void;
  saveState: "idle" | "saving" | "error" | "success";
  saveError: string | null;
  share: ServerGiftShare | null | undefined;
  onCreateShare: () => void;
  onRevokeShare: () => void;
  shareLoading: boolean;
  shareError: string | null;
}) {
  const dueDateBounds = getDueDateBounds();
  const [name, setName] = useState(profile.displayName || "");
  const [city, setCity] = useState(profile.city || "");
  const [babyName, setBabyName] = useState(profile.babyName || "");
  const [dueDate, setDueDateVal] = useState(profile.dueDate || "");
  const [hospital, setHospital] = useState(profile.hospital || "");
  const [supportPerson, setSupportPerson] = useState(profile.supportPerson || "");
  const [personalNotes, setPersonalNotes] = useState(profile.personalNotes || "");
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setName(profile.displayName || "");
    setCity(profile.city || "");
    setBabyName(profile.babyName || "");
    setDueDateVal(profile.dueDate || "");
    setHospital(profile.hospital || "");
    setSupportPerson(profile.supportPerson || "");
    setPersonalNotes(profile.personalNotes || "");
  }, [profile]);

  // Os campos ficam sempre abertos: o lápis de 28px escondia a edição inteira
  // atrás de um alvo difícil de achar. O botão de salvar aparece quando muda algo.
  const isDirty =
    name !== (profile.displayName || "")
    || city !== (profile.city || "")
    || babyName !== (profile.babyName || "")
    || dueDate !== (profile.dueDate || "")
    || hospital !== (profile.hospital || "")
    || supportPerson !== (profile.supportPerson || "")
    || personalNotes !== (profile.personalNotes || "");
  const dueDateError = dueDate ? validateDueDate(dueDate) : null;

  const save = () => {
    onSave({
      displayName: name.trim() || null,
      city: city.trim() || null,
      babyName: babyName.trim() || null,
      dueDate: dueDate || null,
      hospital: hospital.trim() || null,
      supportPerson: supportPerson.trim() || null,
      personalNotes: personalNotes.trim() || null,
    });
  };

  const initials = (profile.displayName || "?").slice(0, 2).toUpperCase();
  const gestation = calcGestation(profile.dueDate);
  const week = gestation?.week ?? null;
  const canSave = isDirty && !dueDateError && saveState !== "saving";

  return (
    <div className="phone-content flow profile-content">
      <div className="eyebrow-row">
        <span>SEU ESPAÇO</span>
        {isDirty && (
          <TinyButton onClick={() => canSave && save()} label="Salvar perfil" testId="button-phone-edit-profile">
            {saveState === "saving" ? <span className="profile-save-dot" /> : <Check size={15} />}
          </TinyButton>
        )}
      </div>
       <h1 className="phone-heading">Seu espaço,<br /><strong>do seu jeito.</strong></h1>
      <div className="profile-card">
        <div className="avatar">{initials}</div>
        <div>
          <h2>{profile.displayName || "Meu perfil"}</h2>
          <p>{gestation ? `${formatGestation(gestation)} de 40` : "data prevista não configurada"}</p>
        </div>
        <Sparkles size={16} />
      </div>
      <div className="white-card profile-form">
        <section className="profile-section">
          <div className="profile-section-heading">
            <div><span className="card-kicker">QUEM ESTÁ PREPARANDO</span><h2>Sobre você</h2></div>
            <span className="optional-badge">opcional</span>
          </div>
           <p className="profile-section-copy">Conte só o que fizer sentido para você.</p>
          <label>
            NOME OU APELIDO
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você prefere ser chamada?" data-testid="input-phone-profile-name" />
          </label>
          <label>
            CIDADE
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Onde você está?" data-testid="input-phone-profile-city" />
          </label>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <div><span className="card-kicker">A PEQUENA PESSOA</span><h2>Sobre o bebê</h2></div>
            <span className="optional-badge">opcional</span>
          </div>
           <p className="profile-section-copy">Nome, apelido ou nada por enquanto — tudo bem.</p>
          <label>
            NOME OU APELIDO DO BEBÊ
            <input value={babyName} onChange={(e) => setBabyName(e.target.value)} placeholder="Como vocês chamam o bebê?" data-testid="input-phone-profile-baby-name" />
          </label>
          <label>
            DATA PREVISTA DO PARTO
            <input
              type="date"
              value={dueDate}
              min={dueDateBounds.min}
              max={dueDateBounds.max}
              aria-invalid={dueDateError ? true : undefined}
              aria-describedby={dueDateError ? "profile-due-date-error" : undefined}
              onChange={(e) => setDueDateVal(e.target.value)}
              className="date-input"
              data-testid="input-phone-profile-due-date"
            />
            {dueDateError && <span className="field-error" role="alert" id="profile-due-date-error">{dueDateError}</span>}
          </label>
          {week && (
            <div className="profile-week"><CalendarDays size={15} /><span>semana gestacional<strong>{gestation ? `${formatGestation(gestation)} de 40` : "—"}</strong></span></div>
          )}
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <div><span className="card-kicker">PARA CHEGAR COM CALMA</span><h2>Organização da chegada</h2></div>
            <span className="optional-badge">opcional</span>
          </div>
           <p className="profile-section-copy">Anote o que ajudar a organizar a chegada, no seu tempo.</p>
          <label>
            MATERNIDADE OU HOSPITAL
            <input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Onde você imagina a chegada?" data-testid="input-phone-profile-hospital" />
          </label>
          <label>
            PESSOA DE APOIO
            <input value={supportPerson} onChange={(e) => setSupportPerson(e.target.value)} placeholder="Quem estará com você?" data-testid="input-phone-profile-support-person" />
          </label>
          <label className="profile-notes-label">
            OBSERVAÇÕES PESSOAIS
            <textarea value={personalNotes} onChange={(e) => setPersonalNotes(e.target.value)} placeholder="Anote algo importante para lembrar depois." rows={3} data-testid="input-phone-profile-notes" />
          </label>
        </section>

        {saveState === "error" && (
          <div className="profile-save-message profile-save-error" role="alert">
            Não foi possível salvar agora. {saveError || "Tente novamente em instantes."}
          </div>
        )}
        {saveState === "success" && !isDirty && (
          <div className="profile-save-message profile-save-success" role="status">
            <CheckCircle2 size={14} /> Perfil salvo.
          </div>
        )}
        {isDirty && (
          <button type="button" className="primary-button" style={{ marginTop: 12 }} onClick={save} disabled={!canSave} data-testid="button-save-profile">
            {saveState === "saving" ? "salvando…" : <><Check size={14} /> salvar perfil</>}
          </button>
        )}
      </div>
      <GiftShareCard
        share={share}
        onCreate={onCreateShare}
        onRevoke={onRevokeShare}
        isLoading={shareLoading}
        error={shareError}
      />
      <button
        type="button"
        className="soft-action"
        style={{ marginTop: 16, justifyContent: "center", gap: 8 }}
        onClick={async () => {
          try {
            await logout();
          } finally {
            qc.clear();
            setLocation("/sign-in");
          }
        }}
        data-testid="button-profile-sign-out"
      >
        <LogOut size={14} /> sair da conta
      </button>
      <div className="soft-action feedback-link">
        <Star size={15} />
        <a href="https://forms.gle/ninho-feedback" target="_blank" rel="noopener noreferrer">
          deixar feedback do beta
        </a>
        <ArrowUpRight size={13} />
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  isRelevant,
  linkedItem,
  matchingItems,
  onAdd,
  onOpenLinkedItem,
  onExpired,
  isPending,
  now,
}: {
  recommendation: Recommendation;
  isRelevant: boolean;
  linkedItem?: ChecklistItem;
  matchingItems: ChecklistItem[];
  onAdd: () => void;
  onOpenLinkedItem: (item: ChecklistItem) => void;
  onExpired: () => void;
  isPending: boolean;
  now: Date;
}) {
  const displayState = getRecommendationDisplayState(recommendation, now);
  if (!displayState.storeUrl) return null;

  return (
    <article className={`recommendation-card ${linkedItem ? "recommendation-card-linked" : ""}`} id={`recommendation-${recommendation.id}`}>
      <div className="recommendation-image-wrap">
        <img
          src={`${basePath}${recommendation.image}`}
          alt=""
          className="recommendation-image"
          style={{ objectPosition: recommendation.imagePosition }}
        />
        <span className="recommendation-category">{recommendation.category}</span>
        {isRelevant && <span className="recommendation-match"><Sparkles size={11} /> combina com sua lista</span>}
      </div>
      <div className="recommendation-copy">
        <span className="card-kicker">{recommendation.use}</span>
        <h2>{recommendation.name}</h2>
        <p>{recommendation.summary}</p>
        <div className="recommendation-footer">
          <div>
            <strong className={recommendation.price === null ? "recommendation-price-unavailable" : ""}>
              {recommendation.price === null ? "Preço a confirmar" : money(recommendation.price)}
            </strong>
            <small>{recommendation.price === null ? `consulte na ${recommendation.store}` : `em ${recommendation.store}`}</small>
            <time className="recommendation-review" dateTime={recommendation.reviewedAt}>revisado em {formatDate(recommendation.reviewedAt)}</time>
          </div>
          <div className="recommendation-actions">
            {linkedItem ? (
              <button
                type="button"
                className="recommendation-add-button recommendation-add-done"
                onClick={() => onOpenLinkedItem(linkedItem)}
                data-testid={`button-recommendation-added-${recommendation.id}`}
              >
                <Check size={12} /> salvo na sua lista
              </button>
            ) : (
              <button
                type="button"
                className="recommendation-add-button"
                onClick={onAdd}
                disabled={isPending}
                data-testid={`button-add-recommendation-${recommendation.id}`}
              >
                <Plus size={12} /> {matchingItems.length ? "salvar ou vincular" : "salvar na lista"}
              </button>
            )}
            <a
              href={displayState.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (!getRecommendationDisplayState(recommendation).storeUrl) {
                  event.preventDefault();
                  onExpired();
                }
              }}
              aria-label={`Abrir ${recommendation.name} na loja externa`}
              data-testid={`link-recommendation-${recommendation.id}`}
            >
              abrir loja externa <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function RecommendationLinkModal({
  recommendation,
  items,
  onClose,
  onCreate,
  onLink,
  isPending,
}: {
  recommendation: Recommendation;
  items: ChecklistItem[];
  onClose: () => void;
  onCreate: () => void;
  onLink: (item: ChecklistItem) => void;
  isPending: boolean;
}) {
  const createButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <ModalShell
      className="recommendation-link-modal"
      labelledBy={`recommendation-link-title-${recommendation.id}`}
      describedBy={`recommendation-link-description-${recommendation.id}`}
      onClose={onClose}
      initialFocusRef={createButtonRef}
    >
      <>
        <div className="modal-top">
          <div><span className="card-kicker">PARA A SUA LISTA</span><h2 id={`recommendation-link-title-${recommendation.id}`}>Como salvar esta inspiração?</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-recommendation-modal"><X size={17} /></TinyButton>
        </div>
        <p className="recommendation-link-description" id={`recommendation-link-description-${recommendation.id}`}>
          <strong>{recommendation.name}</strong> combina com {items.length === 1 ? "um item" : "itens"} de {recommendation.category.toLowerCase()} que já está {items.length === 1 ? "na sua lista" : "na sua lista"}.
        </p>
        <button ref={createButtonRef} type="button" className="primary-button" onClick={onCreate} disabled={isPending} data-testid={`button-create-recommendation-item-${recommendation.id}`}>
          <Plus size={14} /> adicionar como item novo
        </button>
        <div className="recommendation-existing">
          <span className="card-kicker">VINCULAR A UM ITEM EXISTENTE</span>
          {items.map((item) => (
            <button type="button" className="recommendation-existing-item" key={item.id} onClick={() => onLink(item)} disabled={isPending} data-testid={`button-link-recommendation-${recommendation.id}-${item.id}`}>
              <span><strong>{item.name}</strong><small>{item.qty} un. · {item.status}</small></span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <p className="recommendation-link-note">A inspiração fica ligada ao item, mas você continua comprando onde preferir.</p>
      </>
    </ModalShell>
  );
}

function RecommendationsPanel({
  items,
  onAddRecommendation,
  onLinkRecommendation,
  onOpenLinkedItem,
  isActionPending,
  feedback,
  focusId,
}: {
  items: ChecklistItem[];
  onAddRecommendation: (recommendation: Recommendation) => void;
  onLinkRecommendation: (recommendation: Recommendation, item: ChecklistItem) => void;
  onOpenLinkedItem: (item: ChecklistItem) => void;
  isActionPending: boolean;
  feedback: RecommendationFeedback | null;
  focusId: string | null;
}) {
  const [category, setCategory] = useState<"Para você" | CategoryKey>("Para você");
  const [linkingRecommendation, setLinkingRecommendation] = useState<Recommendation | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const handledFocusId = useRef<string | null>(null);
  const now = useRecommendationClock();
  const recommendations = getVisibleRecommendations(now);
  const pendingCategories = useMemo(
    () => new Set(items.filter((item) => item.status === "A comprar").map((item) => item.category)),
    [items],
  );
  const hasPersonalizedSuggestions = pendingCategories.size > 0;
  const visible = recommendations.filter((recommendation) => {
    if (category === "Para você") {
      return hasPersonalizedSuggestions
        ? pendingCategories.has(recommendation.category)
        : recommendation.featured;
    }
    return recommendation.category === category;
  });

  useEffect(() => {
    if (!focusId) {
      handledFocusId.current = null;
      return;
    }
    const recommendation = getVisibleRecommendations(now).find((item) => item.id === focusId);
    if (!recommendation) return;
    if (category !== recommendation.category) {
      setCategory(recommendation.category);
      return;
    }
    if (handledFocusId.current === focusId) return;
    handledFocusId.current = focusId;
    const frame = requestAnimationFrame(() => document.getElementById(`recommendation-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [category, focusId, now]);

  return (
    <div className="phone-content flow recommendations-content">
      <div className="eyebrow-row"><span>INSPIRAÇÕES NINHO</span><Sparkles size={14} /></div>
      <h1 className="phone-heading">Inspirações para<br /><strong>deixar tudo mais leve.</strong></h1>
      <p className="recommendation-context">
        <Sparkles size={14} />
        <span>{hasPersonalizedSuggestions ? "O Ninho seleciona caminhos para as categorias que ainda estão esperando por você." : "Uma seleção editorial do Ninho para inspirar os próximos passos do seu enxoval."}</span>
      </p>
      <div className="filter-row recommendation-filters" aria-label="Filtrar inspirações">
        <Pill active={category === "Para você"} onClick={() => setCategory("Para você")} testId="button-recommendation-for-you">Para você</Pill>
        {CATEGORIES.map((key) => (
          <Pill key={key} active={category === key} onClick={() => setCategory(key)} testId={`button-recommendation-category-${key.toLowerCase()}`}>{key}</Pill>
        ))}
      </div>
      {feedback && <div className={`recommendation-feedback recommendation-feedback-${feedback.tone}`} role="status">{feedback.tone === "success" ? <CheckCircle2 size={14} /> : <X size={14} />}{feedback.message}</div>}
      {availabilityNotice && <div className="recommendation-feedback recommendation-feedback-error" role="status">{availabilityNotice}</div>}
      <div className="recommendation-grid">
        {visible.map((recommendation) => (
          (() => {
            const linkedItem = items.find((item) => item.recommendationId === recommendation.id);
            const matchingItems = items.filter((item) => item.category === recommendation.category && !item.recommendationId);
            return (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                isRelevant={pendingCategories.has(recommendation.category)}
                linkedItem={linkedItem}
                matchingItems={matchingItems}
                onAdd={() => matchingItems.length ? setLinkingRecommendation(recommendation) : onAddRecommendation(recommendation)}
                onOpenLinkedItem={onOpenLinkedItem}
                onExpired={() => setAvailabilityNotice("Esta inspiração acabou de expirar. Atualize a página para ver opções revisadas.")}
                isPending={isActionPending}
                now={now}
              />
            );
          })()
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-recommendations">
          <Sparkles size={24} />
          <p>Nenhuma inspiração encontrada nessa categoria.</p>
        </div>
      )}
      <p className="recommendation-disclaimer">O Ninho seleciona cada inspiração e não vende os produtos. Ao escolher uma delas, você será direcionada para a loja externa.</p>
      {linkingRecommendation && (
        <RecommendationLinkModal
          recommendation={linkingRecommendation}
          items={items.filter((item) => item.category === linkingRecommendation.category && !item.recommendationId)}
          onClose={() => setLinkingRecommendation(null)}
          onCreate={() => { onAddRecommendation(linkingRecommendation); setLinkingRecommendation(null); }}
          onLink={(item) => { onLinkRecommendation(linkingRecommendation, item); setLinkingRecommendation(null); }}
          isPending={isActionPending}
        />
      )}
    </div>
  );
}

type ItemFormValues = { name: string; category: CategoryKey; qty: number; price: number };

/** Campo de dinheiro em pt-BR: aceita vírgula, recusa negativo. */
function parsePriceInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (normalized === "") return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function formatPriceInput(price: number): string {
  return price > 0 ? price.toFixed(2).replace(".", ",") : "";
}

/** Campos compartilhados por adicionar e editar item. */
function ItemFields({
  values, onChange, priceError,
}: {
  values: ItemFormValues;
  onChange: (values: ItemFormValues) => void;
  priceError: string | null;
}) {
  return (
    <>
      <div className="filter-row" style={{ marginBottom: 12 }}>
        {CATEGORIES.map((k) => (
          <Pill key={k} active={values.category === k} onClick={() => onChange({ ...values, category: k })} testId={`button-modal-cat-${k}`}>{k}</Pill>
        ))}
      </div>
      <label className="modal-label">
        NOME DO ITEM
        <input
          value={values.name}
          maxLength={200}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          placeholder="ex.: manta para o carrinho"
          data-testid="input-new-item"
        />
      </label>
      <div className="item-form-row">
        <label className="modal-label">
          QUANTIDADE
          <input
            type="number"
            min={1}
            max={999}
            inputMode="numeric"
            value={values.qty}
            onChange={(event) => onChange({ ...values, qty: Math.max(1, Math.min(999, Number(event.target.value) || 1)) })}
            data-testid="input-item-qty"
          />
        </label>
        <label className="modal-label">
          PREÇO POR UNIDADE
          <span className="price-input">
            <span aria-hidden>R$</span>
            <input
              inputMode="decimal"
              value={formatPriceInput(values.price)}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? "item-price-error" : undefined}
              onChange={(event) => {
                const parsed = parsePriceInput(event.target.value);
                onChange({ ...values, price: parsed ?? values.price });
              }}
              placeholder="0,00"
              data-testid="input-item-price"
            />
          </span>
        </label>
      </div>
      {priceError && <p className="field-error" role="alert" id="item-price-error">{priceError}</p>}
      <p>Este item entra em <strong>{values.category}</strong>.</p>
    </>
  );
}

function AddItemModal({
  onClose, onAdd, category,
}: {
  onClose: () => void;
  onAdd: (values: ItemFormValues) => Promise<void>;
  category: CategoryKey;
}) {
  const [values, setValues] = useState<ItemFormValues>({ name: "", category, qty: 1, price: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Só fecha depois do sucesso: em erro o que foi digitado continua na tela.
  const submit = async () => {
    if (!values.name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onAdd({ ...values, name: values.name.trim() });
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell labelledBy="add-item-title" onClose={onClose} onSubmit={submit}>
      <>
        <div className="modal-top">
          <div><span className="card-kicker">SUA LISTA, SUAS REGRAS</span><h2 id="add-item-title">Adicionar item</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-add-item"><X size={17} /></TinyButton>
        </div>
        <ItemFields values={values} onChange={setValues} priceError={null} />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button" disabled={!values.name.trim() || isSaving} data-testid="button-confirm-add-item">
          <Plus size={15} /> {isSaving ? "salvando…" : "colocar na lista"}
        </button>
      </>
    </ModalShell>
  );
}

function EditItemModal({
  item, onClose, onSave,
}: {
  item: ChecklistItem;
  onClose: () => void;
  onSave: (id: number, values: ItemFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ItemFormValues>({
    name: item.name,
    category: item.category,
    qty: item.qty,
    price: item.price,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!values.name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(item.id, { ...values, name: values.name.trim() });
      onClose();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell labelledBy="edit-item-title" onClose={onClose} onSubmit={submit}>
      <>
        <div className="modal-top">
          <div><span className="card-kicker">AJUSTAR ITEM</span><h2 id="edit-item-title">{item.name}</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-edit-item"><X size={17} /></TinyButton>
        </div>
        <ItemFields values={values} onChange={setValues} priceError={null} />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button" disabled={!values.name.trim() || isSaving} data-testid="button-confirm-edit-item">
          <Check size={15} /> {isSaving ? "salvando…" : "salvar alterações"}
        </button>
      </>
    </ModalShell>
  );
}

function GiftReservationModal({
  item, token, onClose, onReserved,
}: {
  item: PublicGiftItem;
  token: string;
  onClose: () => void;
  onReserved: () => void;
}) {
  const [guestName, setGuestName] = useState("");
  const [status, setStatus] = useState<GiftReservationStatus>("vou presentear");
  const mutation = useMutation({
    mutationFn: () => reservePublicGift(token, {
      itemId: item.id,
      guestName: guestName.trim() || null,
      status,
    }),
    onSuccess: () => {
      onReserved();
      onClose();
    },
  });

  return (
    <ModalShell
      className="gift-reservation-modal"
      labelledBy="reserve-gift-title"
      onClose={onClose}
      onSubmit={() => !mutation.isPending && mutation.mutate()}
    >
      <>
        <div className="modal-top">
          <div><span className="card-kicker">UM PRESENTE COM CARINHO</span><h2 id="reserve-gift-title">{item.name}</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-gift-reservation"><X size={17} /></TinyButton>
        </div>
        <p>Você está reservando {item.qty > 1 ? `${item.qty} unidades` : "este item"} para que ele não se repita.</p>
        <label className="modal-label">
          SEU NOME <small>(opcional)</small>
          <input value={guestName} maxLength={120} onChange={(event) => setGuestName(event.target.value)} placeholder="Como a família vai reconhecer você?" data-testid="input-gift-guest-name" />
        </label>
        <fieldset className="gift-status-picker">
          <legend>COMO VOCÊ QUER MARCAR?</legend>
          <button type="button" className={status === "vou presentear" ? "selected" : ""} onClick={() => setStatus("vou presentear")} data-testid="button-gift-status-intend">
            vou presentear
          </button>
          <button type="button" className={status === "presenteado" ? "selected" : ""} onClick={() => setStatus("presenteado")} data-testid="button-gift-status-gifted">
            já presenteei
          </button>
        </fieldset>
        {mutation.isError && <p className="gift-share-error" role="alert">{getFriendlyErrorMessage(mutation.error)}</p>}
        <button type="submit" className="primary-button" disabled={mutation.isPending} data-testid="button-confirm-gift-reservation">
          <Gift size={15} /> {mutation.isPending ? "reservando…" : "confirmar reserva"}
        </button>
      </>
    </ModalShell>
  );
}
function DesktopSidebar({ location, go }: { location: string; go: (path: string, panel?: number) => void }) {
  const links = [
    { path: "/dashboard", label: "Visão geral", icon: Home, panel: 0 },
    { path: "/checklist", label: "Minha lista", icon: ListChecks, panel: 1 },
    { path: "/milestones", label: "Linha do tempo", icon: History, panel: 2 },
  ];
  return (
    <aside className="desktop-sidebar">
      <div className="desktop-sidebar-brand"><Brand /><span>gestão de enxoval</span></div>
      <div className="desktop-nav-label">SEU NINHO</div>
      <nav className="desktop-nav" aria-label="Navegação principal">
        {links.map(({ path, label, icon: Icon, panel }) => {
          const selected = location === path;
          return (
            <button type="button" key={path} className={`desktop-nav-item ${selected ? "selected" : ""}`} onClick={() => go(path, panel)} data-testid={`button-desktop-nav-${label.toLowerCase().replaceAll(" ", "-")}`}>
              <Icon size={17} /><span>{label}</span>{selected && <span className="desktop-nav-indicator" />}
            </button>
          );
        })}
      </nav>
      <div className="desktop-nav-label desktop-secondary-label">ORGANIZAÇÃO</div>
      <nav className="desktop-nav">
      <button type="button" className={`desktop-nav-item ${location === "/recommendations" ? "selected" : ""}`} onClick={() => go("/recommendations", 0)} data-testid="button-desktop-nav-inspiracoes"><Sparkles size={17} /><span>Inspirações</span>{location === "/recommendations" && <span className="desktop-nav-indicator" />}</button>
        <button type="button" className={`desktop-nav-item ${location === "/budget" ? "selected" : ""}`} onClick={() => go("/budget", 0)} data-testid="button-desktop-nav-orcamento"><WalletCards size={17} /><span>Orçamento</span></button>
        <button type="button" className={`desktop-nav-item ${location === "/profile" ? "selected" : ""}`} onClick={() => go("/profile", 0)} data-testid="button-desktop-nav-perfil"><UserRound size={17} /><span>Meu perfil</span></button>
      </nav>
      <div className="desktop-sidebar-footer"><div className="desktop-footer-orbit"><Sparkles size={15} /></div><div><strong>Um passo de cada vez.</strong><span>sem pressa, sem excesso</span></div></div>
    </aside>
  );
}

function DesktopSideSummary({ items, milestones: miles, profile, go }: { items: ChecklistItem[]; milestones: ServerMilestone[]; profile: ServerProfile; go: (path: string, panel?: number) => void }) {
  const done = items.filter((i) => i.status !== "A comprar").length;
  const score = items.length ? Math.round((done / items.length) * 100) : 0;
  const week = calcGestationalWeek(profile.dueDate);
  const nextMilestone = getNextMilestone(miles, week);
  const nextItem = items.find((i) => i.status === "A comprar" && i.essential);

  return (
    <aside className="desktop-side">
      <div className="desktop-side-card desktop-next-card">
        <div className="desktop-side-card-top"><span className="card-kicker">PRÓXIMO PASSO</span><span className="desktop-side-icon"><ChevronRight size={15} /></span></div>
        {nextItem ? (
          <>
            <h3>{nextItem.name}</h3>
            <p>Item essencial pendente em {nextItem.category}.</p>
          </>
        ) : nextMilestone ? (
          <>
            <h3>Semana {nextMilestone.week}</h3>
            <p>{nextMilestone.title}</p>
          </>
        ) : (
          <>
            <h3>Você está em dia!</h3>
            <p>Todos os itens essenciais estão resolvidos.</p>
          </>
        )}
        <Progress value={score} />
        <button type="button" className="desktop-text-button" onClick={() => go("/checklist", 1)} data-testid="button-desktop-next-step">abrir checklist <ArrowUpRight size={14} /></button>
      </div>
      <div className="desktop-side-card">
        <div className="desktop-side-card-top"><span className="card-kicker">SEU PROGRESSO</span><span className="desktop-progress-number">{score}%</span></div>
        <div className="desktop-progress-row"><strong>{done}</strong><span>itens já resolvidos<br />de {items.length} no total</span></div>
        <div className="desktop-mini-bars">
          <i style={{ height: "58%" }} /><i style={{ height: "73%" }} />
          <i className="current" style={{ height: `${Math.max(35, score)}%` }} />
          <i style={{ height: "44%" }} /><i style={{ height: "64%" }} />
        </div>
      </div>
    </aside>
  );
}

function DesktopWorkspace({ location, go, items, milestones: miles, profile, budget, content }: {
  location: string; go: (path: string, panel?: number) => void;
  items: ChecklistItem[]; milestones: ServerMilestone[];
  profile: ServerProfile; budget: ServerBudgetCategory[];
  content: ReactNode;
}) {
  const titles: Record<string, string> = { "/dashboard": "Visão geral", "/checklist": "Minha lista", "/milestones": "Linha do tempo", "/recommendations": "Inspirações", "/budget": "Orçamento", "/profile": "Meu perfil" };
  const title = titles[location] ?? "Ninho";
  const isOverview = location === "/dashboard";
  const routeClass = `desktop-route-${location.slice(1) || "dashboard"}`;
  const done = items.filter((i) => i.status !== "A comprar").length;
  const score = items.length ? Math.round((done / items.length) * 100) : 0;
  const name = profile.displayName || "você";

  return (
    <div className="desktop-workspace">
      <DesktopSidebar location={location} go={go} />
      <main className="desktop-main">
        <header className="desktop-header">
          <div><span className="desktop-greeting">{todayLabel()}</span><h1>{title}</h1></div>
          <div className="desktop-header-actions">
            <button type="button" className="desktop-help-button"><Sparkles size={15} /> seu espaço, do seu jeito</button>
            <AccountControl onProfile={() => go("/profile", 0)} />
          </div>
        </header>
        {isOverview && (
          <section className="desktop-welcome">
            <div>
              <span className="desktop-eyebrow">BEM-VINDA DE VOLTA, {name.toUpperCase()}</span>
              <h2>Seu caminho está tomando forma.</h2>
              <p>Uma visão tranquila do que já foi resolvido e do que vem a seguir.</p>
            </div>
            <div className="desktop-welcome-score">
              <span>PREPARAÇÃO</span><strong>{score}%</strong><small>do enxoval resolvido</small>
            </div>
          </section>
        )}
        <div className={`desktop-content-grid ${routeClass} ${isOverview ? "" : "desktop-content-grid-single"}`}>
          <section className="desktop-primary"><div className="desktop-panel-surface">{content}</div></section>
          {isOverview && <DesktopSideSummary items={items} milestones={miles} profile={profile} go={go} />}
        </div>
      </main>
    </div>
  );
}

// ─── Workspace (authenticated shell) ─────────────────────────────────────────

function Workspace({ userId: uid }: { userId: string }) {
  const qc = useQueryClient();

  // When the signed-in user changes (e.g. same browser, different account),
  // remove all workspace cache entries so the new user starts fresh.
  useEffect(() => {
    return () => {
      qc.removeQueries({ queryKey: ["workspace"] });
    };
  }, [uid, qc]);

  // Scope every cache entry by userId so different accounts in the same
  // browser session can never share cached workspace data.
  const wqKey = ["workspace", uid] as const;

  const workspaceQuery = useQuery({
    queryKey: wqKey,
    queryFn: fetchWorkspace,
    staleTime: 60_000,
  });
  const shareQuery = useQuery({
    queryKey: ["gift-share", uid],
    queryFn: getGiftShare,
    staleTime: Infinity,
  });

  const [location, setLocation] = useLocation();
  const [desktopView, setDesktopView] = useState(() => window.matchMedia("(min-width: 901px)").matches);
  const [activePanel, setActivePanel] = useState(location === "/checklist" ? 1 : location === "/milestones" ? 2 : 0);
  const [addOpen, setAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<CategoryKey>("Roupas");
  const [recommendationFocusId, setRecommendationFocusId] = useState<string | null>(null);
  const [recommendationFeedback, setRecommendationFeedback] = useState<RecommendationFeedback | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);

  // Um aviso é sobre a tela onde aconteceu: ao trocar de rota ele sai.
  useEffect(() => { setActionFeedback(null); }, [location]);

  const showActionFeedback = (feedback: ActionFeedback) => {
    setActionFeedback(feedback);
    if (feedback.tone === "success") {
      // Avisos com ação (o "Desfazer" da remoção) ficam mais tempo: 3s não dá
      // para ler a frase e decidir.
      window.setTimeout(() => {
        setActionFeedback((current) => current?.message === feedback.message ? null : current);
      }, feedback.action ? 8000 : 3200);
    }
  };

  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const sync = () => setDesktopView(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old ? { ...old, profile } : old);
      showActionFeedback({ tone: "success", message: "Perfil salvo com sucesso." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível salvar o perfil. Revise sua conexão e tente novamente." }),
  });

  const addItemMutation = useMutation({
    mutationFn: createChecklistItem,
    onSuccess: (item) => {
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: [...old.items, item] } : old,
      );
      showActionFeedback({ tone: "success", message: "Item adicionado à sua lista." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível adicionar o item. Tente novamente." }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; category?: CategoryKey; status?: ItemStatus; qty?: number; price?: number; recommendationId?: string | null } }) =>
      updateChecklistItem(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: wqKey });
      const prev = qc.getQueryData<Workspace>(wqKey);
      // A API guarda price como numeric (string); o formulário manda número.
      const { price, ...rest } = data;
      const patch: Partial<ServerChecklistItem> =
        price === undefined ? rest : { ...rest, price: String(price) };
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: old.items.map((i) => i.id === id ? { ...i, ...patch } : i) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(wqKey, ctx.prev);
      showActionFeedback({ tone: "error", message: "A alteração não foi salva e o estado anterior foi restaurado." });
    },
    onSuccess: (_item, { data }) => {
      if (!("recommendationId" in data)) {
        showActionFeedback({ tone: "success", message: "Item atualizado na sua lista." });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: wqKey }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteChecklistItem,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: wqKey });
      const prev = qc.getQueryData<Workspace>(wqKey);
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(wqKey, ctx.prev);
      showActionFeedback({ tone: "error", message: "Não foi possível remover o item. Ele foi restaurado na lista." });
    },
    // O aviso (com "Desfazer") é dado por quem chama, que conhece o item.
    onSettled: () => qc.invalidateQueries({ queryKey: wqKey }),
  });

  const createShareMutation = useMutation({
    mutationFn: createGiftShare,
    onSuccess: (share) => {
      qc.setQueryData(["gift-share", uid], share);
      showActionFeedback({ tone: "success", message: "Novo link de presentes criado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível criar o link de presentes." }),
  });

  const revokeShareMutation = useMutation({
    mutationFn: revokeGiftShare,
    onSuccess: () => {
      qc.setQueryData(["gift-share", uid], null);
      showActionFeedback({ tone: "success", message: "O link público foi revogado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível revogar o link público." }),
  });

  const updateGiftReservationMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: GiftReservationStatus }) =>
      updateGiftReservation(id, { status }),
    onSuccess: (reservation) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old
        ? { ...old, giftReservations: old.giftReservations.map((current) => current.id === reservation.id ? reservation : current) }
        : old);
      showActionFeedback({ tone: "success", message: "Status do presente atualizado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível atualizar o presente." }),
  });

  const deleteGiftReservationMutation = useMutation({
    mutationFn: deleteGiftReservation,
    onSuccess: (_result, id) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old
        ? { ...old, giftReservations: old.giftReservations.filter((reservation) => reservation.id !== id) }
        : old);
      showActionFeedback({ tone: "success", message: "Reserva desfeita e item liberado." });
    },
    onError: () => showActionFeedback({ tone: "error", message: "Não foi possível desfazer a reserva." }),
  });

  const milestoneMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) => toggleMilestone(id, completed),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: wqKey });
      const prev = qc.getQueryData<Workspace>(wqKey);
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, milestones: old.milestones.map((m) => m.id === id ? { ...m, completed } : m) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(wqKey, ctx.prev);
      showActionFeedback({ tone: "error", message: "Não foi possível atualizar o marco. O estado anterior foi restaurado." });
    },
    onSuccess: (_milestone, { completed }) => showActionFeedback({
      tone: "success",
      message: completed ? "Marco concluído." : "Marco voltou para pendente.",
    }),
    onSettled: () => qc.invalidateQueries({ queryKey: wqKey }),
  });

  const budgetMutation = useMutation({
    mutationFn: (categories: Array<{ category: string; planned: number }>) =>
      updateBudget({ categories }),
    // A confirmação e o erro aparecem dentro do próprio card do orçamento
    // (BudgetPanel), junto dos valores: um aviso só, no lugar certo.
    onSuccess: (budget) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old ? { ...old, budget } : old);
    },
  });

  const profileSaveState: "idle" | "saving" | "error" | "success" = profileMutation.isPending
    ? "saving"
    : profileMutation.isError
      ? "error"
      : profileMutation.isSuccess
        ? "success"
        : "idle";
  const profileSaveError = profileMutation.error instanceof Error ? profileMutation.error.message : null;

  // ── Loading / Error states ───────────────────────────────────────────────

  if (workspaceQuery.isLoading) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ErrorState message="Não foi possível carregar seus dados. Verifique sua conexão." onRetry={() => workspaceQuery.refetch()} />
      </div>
    );
  }

  const { profile, items: rawItems, milestones: miles, budget, giftReservations } = workspaceQuery.data;
  const reservationsByItem = new Map(giftReservations.map((reservation) => [reservation.checklistItemId, reservation]));
  const items = rawItems.map((item) => adaptItem(item, reservationsByItem.get(item.id) ?? null));

  // ── Onboarding ──────────────────────────────────────────────────────────

  if (!profile.onboardingComplete) {
    return (
      <div className="ninho-app">
        <OnboardingModal userId={uid} onComplete={() => qc.invalidateQueries({ queryKey: wqKey })} />
      </div>
    );
  }

  // ── Navigation helpers ───────────────────────────────────────────────────

  const go = (path: string, panel?: number) => {
    if (panel !== undefined) setActivePanel(panel);
    setLocation(path);
  };

  const openAdd = (cat: CategoryKey) => { setAddCategory(cat); setAddOpen(true); };

  /** Id do item que está gravando: as outras linhas continuam utilizáveis. */
  const pendingItemId =
    updateItemMutation.isPending ? updateItemMutation.variables?.id ?? null
      : deleteItemMutation.isPending ? deleteItemMutation.variables ?? null
        : null;

  const handleAddItem = async (values: { name: string; category: CategoryKey; qty: number; price: number }) => {
    await addItemMutation.mutateAsync(values);
    setAddOpen(false);
  };

  const handleEditItem = async (id: number, values: { name: string; category: CategoryKey; qty: number; price: number }) => {
    await updateItemMutation.mutateAsync({ id, data: values });
  };

  const handleToggle = (id: number, status: ItemStatus) => {
    updateItemMutation.mutate({ id, data: { status } });
  };

  /** Remove na hora e oferece desfazer: recria o item com os mesmos dados. */
  const handleDelete = (id: number) => {
    const item = items.find((current) => current.id === id);
    if (!item) return;
    deleteItemMutation.mutate(id, {
      onSuccess: () => showActionFeedback({
        tone: "success",
        message: `“${item.name}” saiu da lista.`,
        action: {
          label: "Desfazer",
          onAction: () => addItemMutation.mutate({
            name: item.name,
            category: item.category,
            group: item.group,
            qty: item.qty,
            price: item.price,
          }),
        },
      }),
    });
  };

  const handleAddRecommendation = (recommendation: Recommendation) => {
    setRecommendationFeedback(null);
    addItemMutation.mutate(
      {
        name: recommendation.name,
        category: recommendation.category,
        group: "Inspiração Ninho",
        price: recommendation.price ?? 0,
        recommendationId: recommendation.id,
      },
      {
        onSuccess: () => setRecommendationFeedback({ tone: "success", message: "Inspiração salva na sua lista como “A comprar”." }),
        onError: (error) => setRecommendationFeedback({
          tone: "error",
          message: error instanceof Error && error.message ? error.message : "Não foi possível salvar esta inspiração agora.",
        }),
      },
    );
  };

  const handleLinkRecommendation = (recommendation: Recommendation, item: ChecklistItem) => {
    setRecommendationFeedback(null);
    updateItemMutation.mutate(
      { id: item.id, data: { recommendationId: recommendation.id } },
      {
        onSuccess: () => setRecommendationFeedback({ tone: "success", message: "Inspiração vinculada ao item da sua lista." }),
        onError: (error) => setRecommendationFeedback({
          tone: "error",
          message: error instanceof Error && error.message ? error.message : "Não foi possível vincular esta inspiração agora.",
        }),
      },
    );
  };

  const handleUnlinkRecommendation = (id: number) => {
    updateItemMutation.mutate(
      { id, data: { recommendationId: null } },
      {
        onSuccess: () => setRecommendationFeedback({ tone: "success", message: "A inspiração foi desvinculada; o item continua na sua lista." }),
        onError: (error) => setRecommendationFeedback({
          tone: "error",
          message: error instanceof Error && error.message ? error.message : "Não foi possível desvincular esta inspiração agora.",
        }),
      },
    );
  };

  const handleMilestoneToggle = (id: number, completed: boolean) => {
    milestoneMutation.mutate({ id, completed });
  };

  const handleProfileSave = (data: UpdateProfileInput) => {
    profileMutation.reset();
    profileMutation.mutate(data);
  };

  const handleBudgetSave = (cats: Array<{ category: string; planned: number }>) => {
    budgetMutation.mutate(cats);
  };

  const handleReleaseGiftReservation = (reservationId: number) => {
    deleteGiftReservationMutation.mutate(reservationId);
  };

  const handleUpdateGiftReservation = (reservationId: number, status: GiftReservationStatus) => {
    updateGiftReservationMutation.mutate({ id: reservationId, status });
  };

  // ── Panel content ────────────────────────────────────────────────────────

  const overviewPanel = (
    <OverviewPanel items={items} profile={profile} milestones={miles} budget={budget}
      setLocation={(p) => go(p, p === "/checklist" ? 1 : p === "/milestones" ? 2 : 0)}
    />
  );
  const checklistPanel = (
    <ChecklistPanel
      items={items}
      onToggle={handleToggle}
      onAdd={openAdd}
      onEdit={setEditingItem}
      onDelete={handleDelete}
      onOpenRecommendation={(id) => { setRecommendationFocusId(id); go("/recommendations", 0); }}
      onUnlinkRecommendation={handleUnlinkRecommendation}
      onReleaseGiftReservation={handleReleaseGiftReservation}
      onUpdateGiftReservation={handleUpdateGiftReservation}
      pendingItemId={pendingItemId}
      isActionPending={addItemMutation.isPending}
    />
  );
  const milestonePanel = (
    <TimelinePanel milestones={miles} profile={profile} onToggle={handleMilestoneToggle} isActionPending={milestoneMutation.isPending} />
  );
  const budgetPanel = (
    <BudgetPanel
      items={items}
      budget={budget}
      onSave={handleBudgetSave}
      onEdit={() => budgetMutation.reset()}
      saveState={budgetMutation.isPending ? "saving" : budgetMutation.isError ? "error" : budgetMutation.isSuccess ? "success" : "idle"}
    />
  );
  const profilePanel = (
    <ProfilePanel
      profile={profile}
      onSave={handleProfileSave}
      saveState={profileSaveState}
      saveError={profileSaveError}
      share={shareQuery.data}
      onCreateShare={() => {
        createShareMutation.reset();
        createShareMutation.mutate();
      }}
      onRevokeShare={() => {
        revokeShareMutation.reset();
        revokeShareMutation.mutate();
      }}
      shareLoading={createShareMutation.isPending || revokeShareMutation.isPending}
      shareError={
        createShareMutation.isError ? getAuthErrorMessage(createShareMutation.error)
          : revokeShareMutation.isError ? getAuthErrorMessage(revokeShareMutation.error)
            : null
      }
    />
  );
  const recommendationsPanel = (
    <RecommendationsPanel
      items={items}
      onAddRecommendation={handleAddRecommendation}
      onLinkRecommendation={handleLinkRecommendation}
      onOpenLinkedItem={(_item) => go("/checklist", 1)}
      isActionPending={addItemMutation.isPending || updateItemMutation.isPending}
      feedback={recommendationFeedback}
      focusId={recommendationFocusId}
    />
  );

  const desktopContent = location === "/checklist" ? checklistPanel
    : location === "/milestones" ? milestonePanel
    : location === "/recommendations" ? recommendationsPanel
    : location === "/budget" ? budgetPanel
    : location === "/profile" ? profilePanel
    : overviewPanel;

  // ── Desktop layout ───────────────────────────────────────────────────────

  if (desktopView) {
    return (
      <div className="ninho-app">
        <DesktopWorkspace location={location} go={go} items={items} milestones={miles} profile={profile} budget={budget} content={desktopContent} />
        {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onAdd={handleAddItem} category={addCategory} />}
        {editingItem && <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditItem} />}
        <ActionFeedbackBanner feedback={actionFeedback} onDismiss={() => setActionFeedback(null)} />
      </div>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────

  const panelOne = location === "/budget" ? budgetPanel : location === "/profile" ? profilePanel : location === "/recommendations" ? recommendationsPanel : overviewPanel;
  const panelTwo = checklistPanel;
  const panelThree = milestonePanel;

  return (
    <div className="ninho-app">
      <div className="stage-toolbar">
        <div className="toolbar-left">
          <Brand />
          <span className="toolbar-divider" />
          <span className="toolbar-caption">gestão de enxoval</span>
        </div>
        <div className="toolbar-actions">
          <MobileUtilityLinks location={location} onBudget={() => go("/budget", 0)} onProfile={() => go("/profile", 0)} />
          <span className="mobile-account-control"><AccountControl onProfile={() => go("/profile", 0)} /></span>
        </div>
      </div>
      <div className="phone-stage">
        <Phone title="Ninho" activeRoute={location} setLocation={go} activePanel={activePanel} onPanel={setActivePanel}>
          {panelOne}
        </Phone>
        <Phone title="Registro rápido" activeRoute={location} setLocation={go} activePanel={activePanel} onPanel={setActivePanel}>
          {panelTwo}
        </Phone>
        <Phone title="Sua jornada" activeRoute={location} setLocation={go} activePanel={activePanel} onPanel={setActivePanel}>
          {panelThree}
        </Phone>
      </div>
      {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onAdd={handleAddItem} category={addCategory} />}
        {editingItem && <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleEditItem} />}
      <ActionFeedbackBanner feedback={actionFeedback} onDismiss={() => setActionFeedback(null)} />
    </div>
  );
}


// ─── Auth pages ───────────────────────────────────────────────────────────────

type AuthMode = "signin" | "signup";

/**
 * Mensagem para a usuária. A API manda um texto pronto em pt-BR na maioria dos
 * casos; quando não manda, o status vira uma frase — nunca "HTTP 400 Bad
 * Request", que já apareceu na tela.
 */
function getFriendlyErrorMessage(error: unknown): string {
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

const getAuthErrorMessage = getFriendlyErrorMessage;

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-mobile-visual">
        <img src={loginHeroImage} alt="" aria-hidden />
        <div className="auth-mobile-overlay" aria-hidden />
        <Brand />
        <p className="auth-mobile-tagline">Prepare a chegada<br /><strong>com leveza.</strong></p>
      </div>
      <div className="auth-panel">
        <Brand />
        <img src={loginHeroImage} alt="" className="auth-hero-image" aria-hidden />
        <div className="auth-copy">
          <span className="desktop-eyebrow">ORGANIZAÇÃO DE ENXOVAL</span>
          <h1>Prepare a chegada<br /><strong>com leveza.</strong></h1>
          <p>Checklists, orçamento e linha do tempo — tudo no seu ritmo.</p>
        </div>
      </div>
      <div className="auth-form-panel">{children}</div>
    </div>
  );
}

type AuthFieldErrors = { email?: string; password?: string; confirmation?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup";
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const sessionExpired = !isSignup && new URLSearchParams(window.location.search).get("expirou") === "1";
  const mutation = useMutation({
    mutationFn: () => isSignup ? register({ email, password }) : login({ email, password }),
    onSuccess: (session) => {
      qc.clear();
      qc.setQueryData<AuthSession>(["auth-session"], session);
      setLocation("/dashboard");
    },
  });

  /**
   * Valida todos os campos de uma vez e marca cada um: antes, um e-mail
   * inválido junto de senhas diferentes mostrava só um erro por vez, no rodapé.
   * No login não checamos o tamanho da senha — quem decide é o servidor, para
   * não travar contas antigas com uma mensagem enganosa.
   */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: AuthFieldErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) errors.email = "Digite seu e-mail para continuar.";
    else if (!EMAIL_PATTERN.test(normalizedEmail)) errors.email = "Confira o e-mail: parece faltar algo.";

    if (!password) errors.password = "Digite sua senha.";
    else if (isSignup && password.length < 8) errors.password = "A senha precisa ter pelo menos 8 caracteres.";

    if (isSignup && password && password !== confirmation) {
      errors.confirmation = "As senhas não são iguais.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.email) emailRef.current?.focus();
      else document.querySelector<HTMLInputElement>(errors.password ? "#auth-password" : "#auth-confirmation")?.focus();
      return;
    }
    mutation.mutate();
  };

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit} noValidate>
          <div className="auth-card-header">
            <span className="card-kicker">{isSignup ? "SEU ESPAÇO" : "BEM-VINDA DE VOLTA"}</span>
            <h2>{isSignup ? "Crie seu ninho" : "Que bom ter você de volta"}</h2>
            <p>{isSignup ? "Comece a organizar a chegada com leveza." : "Entre para continuar preparando com calma."}</p>
          </div>
          {sessionExpired && (
            <p className="auth-notice" role="status">Sua sessão expirou. Entre de novo para continuar de onde parou.</p>
          )}
          <div className="auth-fields">
            <label className="auth-field">
              E-MAIL
              <input
                ref={emailRef}
                type="email"
                autoComplete={isSignup ? "email" : "username"}
                value={email}
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
                onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); }}
                placeholder="voce@email.com"
                data-testid="input-auth-email"
              />
              {fieldErrors.email && <span className="field-error" role="alert" id="auth-email-error">{fieldErrors.email}</span>}
            </label>
            <label className="auth-field">
              SENHA
              <PasswordField
                id="auth-password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(value) => { setPassword(value); setFieldErrors((current) => ({ ...current, password: undefined })); }}
                placeholder={isSignup ? "Pelo menos 8 caracteres" : "Sua senha"}
                invalid={Boolean(fieldErrors.password)}
                describedBy={fieldErrors.password ? "auth-password-error" : isSignup ? "auth-password-hint" : undefined}
                testId="input-auth-password"
                toggleTestId="button-toggle-auth-password"
              />
              {isSignup && !fieldErrors.password && (
                <span className="field-hint" id="auth-password-hint">Pelo menos 8 caracteres.</span>
              )}
              {fieldErrors.password && <span className="field-error" role="alert" id="auth-password-error">{fieldErrors.password}</span>}
            </label>
            {!isSignup && (
              <button type="button" className="auth-forgot" onClick={() => setLocation("/forgot-password")} data-testid="button-forgot-password">
                Esqueci minha senha
              </button>
            )}
            {isSignup && (
              <label className="auth-field">
                CONFIRME A SENHA
                <PasswordField
                  id="auth-confirmation"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(value) => { setConfirmation(value); setFieldErrors((current) => ({ ...current, confirmation: undefined })); }}
                  placeholder="Repita sua senha"
                  invalid={Boolean(fieldErrors.confirmation)}
                  describedBy={fieldErrors.confirmation ? "auth-confirmation-error" : undefined}
                  testId="input-auth-confirmation"
                  toggleTestId="button-toggle-auth-confirmation"
                />
                {fieldErrors.confirmation && <span className="field-error" role="alert" id="auth-confirmation-error">{fieldErrors.confirmation}</span>}
              </label>
            )}
          </div>
          {mutation.isError && (
            <p className="auth-error" role="alert">{getFriendlyErrorMessage(mutation.error)}</p>
          )}
          <button type="submit" className="primary-button auth-submit" disabled={mutation.isPending} data-testid="button-auth-submit">
            {mutation.isPending ? "Aguarde…" : isSignup ? "Criar minha conta" : "Entrar no meu ninho"}
          </button>
          <p className="auth-switch">
            {isSignup ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <button type="button" onClick={() => setLocation(isSignup ? "/sign-in" : "/sign-up")}>
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>
      </form>
    </AuthLayout>
  );
}

function PasswordResetRequestPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: () => requestPasswordReset({ email: email.trim() }) });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidationError("Digite um e-mail válido.");
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  if (mutation.isSuccess) {
    return (
      <AuthLayout>
        <div className="auth-card auth-result-card">
          <Mail size={22} className="auth-result-icon" />
          <div className="auth-card-header">
            <span className="card-kicker">CONFIRA SEU E-MAIL</span>
            <h2>Se houver uma conta, o link está a caminho.</h2>
            <p>Enviamos instruções para redefinir sua senha. Se a mensagem não aparecer, confira o spam.</p>
          </div>
          <button type="button" className="primary-button auth-submit" onClick={() => setLocation("/sign-in")} data-testid="button-back-to-sign-in">
            <ArrowLeft size={14} /> voltar para entrar
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-card-header">
          <span className="card-kicker">RECUPERE SEU ESPAÇO</span>
          <h2>Esqueceu sua senha?</h2>
          <p>Digite seu e-mail e, se houver uma conta, enviaremos um link temporário para você voltar ao seu ninho.</p>
        </div>
        <div className="auth-fields">
          <label className="auth-field">
            E-MAIL
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              data-testid="input-reset-email"
            />
          </label>
        </div>
        {(validationError || mutation.isError) && (
          <p className="auth-error" role="alert">{validationError || getAuthErrorMessage(mutation.error)}</p>
        )}
        <button type="submit" className="primary-button auth-submit" disabled={mutation.isPending} data-testid="button-request-reset">
          {mutation.isPending ? "Enviando…" : "Enviar link de recuperação"}
        </button>
        <p className="auth-switch">
          <button type="button" onClick={() => setLocation("/sign-in")} data-testid="button-reset-back-to-sign-in">
            <ArrowLeft size={12} /> voltar para entrar
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

function PasswordResetPage() {
  const [, setLocation] = useLocation();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const mutation = useMutation({
    mutationFn: () => resetPassword({ token, password }),
    onSuccess: () => setComplete(true),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setValidationError("Este link de recuperação é inválido ou expirou.");
      return;
    }
    if (password.length < 8) {
      setValidationError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setValidationError("A confirmação de senha não corresponde.");
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  if (complete) {
    return (
      <AuthLayout>
        <div className="auth-card auth-result-card">
          <div className="auth-result-check">✓</div>
          <div className="auth-card-header">
            <span className="card-kicker">TUDO PRONTO</span>
            <h2>Senha redefinida.</h2>
            <p>Suas sessões antigas foram encerradas. Entre novamente com a nova senha.</p>
          </div>
          <button type="button" className="primary-button auth-submit" onClick={() => setLocation("/sign-in")} data-testid="button-reset-success-sign-in">
            entrar no meu ninho
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-card-header">
          <span className="card-kicker">NOVA SENHA</span>
          <h2>Crie uma nova senha</h2>
          <p>Escolha uma senha com pelo menos 8 caracteres para proteger seu ninho.</p>
        </div>
        <input className="auth-hidden-username" type="email" autoComplete="username" name="username" value="" readOnly tabIndex={-1} aria-hidden />
        <div className="auth-fields">
          <label className="auth-field">
            NOVA SENHA
            <input
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Pelo menos 8 caracteres"
              data-testid="input-new-password"
            />
          </label>
          <label className="auth-field">
            CONFIRME A NOVA SENHA
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Repita sua senha"
              data-testid="input-new-password-confirmation"
            />
          </label>
        </div>
        {(validationError || mutation.isError) && (
          <p className="auth-error" role="alert">{validationError || getAuthErrorMessage(mutation.error)}</p>
        )}
        <button type="submit" className="primary-button auth-submit" disabled={mutation.isPending || !token} data-testid="button-complete-reset">
          {mutation.isPending ? "Salvando…" : "Salvar nova senha"}
        </button>
        <p className="auth-switch">
          <button type="button" onClick={() => setLocation("/sign-in")} data-testid="button-reset-cancel">
            <ArrowLeft size={12} /> voltar para entrar
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

function AuthenticatedApp({ userId }: { userId: string }) {
  const [location] = useLocation();
  if (location === "/") return <Redirect to="/dashboard" />;
  return <Workspace userId={userId} />;
}

function AppRouter() {
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

function NinhoApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
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

function PublicGiftPage() {
  const [, params] = useRoute("/gift/:token");
  const token = params?.token || "";
  const [selectedItem, setSelectedItem] = useState<PublicGiftItem | null>(null);
  const listQuery = useQuery({
    queryKey: ["public-gift-list", token],
    queryFn: () => fetchPublicGiftList(token),
    enabled: Boolean(token),
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  });
  const qc = useQueryClient();
  const title = listQuery.data?.ownerName ? `Lista de presentes de ${listQuery.data.ownerName}` : "Lista de presentes";

  if (listQuery.isPending) {
    return <div className="public-gift-page"><LoadingSpinner /></div>;
  }

  if (listQuery.isError || !listQuery.data) {
    return (
      <main className="public-gift-page public-gift-state">
        <Brand />
        <div className="public-gift-invalid">
          <Link2 size={30} />
          <span className="card-kicker">LINK INDISPONÍVEL</span>
          <h1>Esta lista não está mais disponível.</h1>
          <p>Ela pode ter sido revogada ou o endereço não está completo. Peça um novo link para quem compartilhou.</p>
        </div>
      </main>
    );
  }

  const { items, babyName } = listQuery.data;
  const available = items.filter((item) => !item.reserved).length;
  return (
    <main className="public-gift-page">
      <header className="public-gift-header">
        <Brand />
        <span>LISTA COMPARTILHADA COM CARINHO</span>
      </header>
      <section className="public-gift-hero">
        <span className="card-kicker">CHEGADA EM PREPARO</span>
        <h1>{title}</h1>
        <p>{babyName ? `Para celebrar a chegada de ${babyName}.` : "Uma seleção de itens para cuidar da nova chegada."}</p>
        <div className="public-gift-summary"><Gift size={15} /><span>{available} {available === 1 ? "item disponível" : "itens disponíveis"} para presentear</span></div>
      </section>
      <section className="public-gift-list" aria-label="Itens para presentear">
        {items.length === 0 ? (
          <div className="public-gift-empty"><CheckCircle2 size={27} /><h2>Todos os itens já foram resolvidos.</h2><p>Que bonito ver tanta gente cuidando desta chegada.</p></div>
        ) : items.map((item) => {
          const Icon = iconForCategory(item.category as CategoryKey);
          return (
            <article className={`public-gift-item ${item.reserved ? "is-reserved" : ""}`} key={item.id}>
              <span className="public-gift-item-icon"><Icon size={17} /></span>
              <div className="public-gift-item-copy">
                <small>{item.category} · {item.qty} {item.qty === 1 ? "unidade" : "unidades"}</small>
                <h2>{item.name}</h2>
                {item.reserved && <p><CheckCircle2 size={13} /> {item.reservation?.guestName ? `${item.reservation.guestName} ${item.reservation.status}` : `Item ${item.reservation?.status || "reservado"}`}</p>}
              </div>
              {item.reserved ? (
                <span className="public-gift-reserved">reservado</span>
              ) : (
                <button type="button" onClick={() => setSelectedItem(item)} data-testid={`button-reserve-gift-${item.id}`}>
                  <Gift size={14} /> vou presentear
                </button>
              )}
            </article>
          );
        })}
      </section>
      <p className="public-gift-note">Os valores, o orçamento e os dados pessoais desta família não aparecem aqui.</p>
      {selectedItem && (
        <GiftReservationModal
          item={selectedItem}
          token={token}
          onClose={() => setSelectedItem(null)}
          onReserved={() => qc.invalidateQueries({ queryKey: ["public-gift-list", token] })}
        />
      )}
    </main>
  );
}
