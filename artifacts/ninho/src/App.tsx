import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { ptBR } from "@clerk/localizations";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Gift,
  Heart,
  History,
  Home,
  ListChecks,
  LogOut,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
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
  type Workspace,
  type ServerChecklistItem,
  type ServerProfile,
  type ServerMilestone,
  type ServerBudgetCategory,
  type ItemStatus,
  type CategoryKey,
} from "@/lib/api";

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
};

function adaptItem(s: ServerChecklistItem): ChecklistItem {
  return {
    id: s.id,
    name: s.name,
    category: s.category as CategoryKey,
    group: s.group,
    qty: s.qty,
    status: s.status as ItemStatus,
    price: parseFloat(s.price) || 0,
    essential: s.essential,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const loginHeroImage = `${basePath}/login-pregnancy.png`;

// Clerk emits full browser paths, while Wouter routes are relative to the
// artifact base path. Keep auth navigation client-side and avoid a full reload.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const CATEGORIES: CategoryKey[] = ["Roupas", "Higiene", "Alimentação", "Acessórios"];

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const iconForCategory = (cat: CategoryKey) =>
  cat === "Alimentação" ? Utensils : cat === "Higiene" ? ClipboardCheck : cat === "Acessórios" ? Sparkles : Heart;

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function calcWeek(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate + "T12:00:00");
  const today = new Date();
  const daysToGo = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  const w = Math.round(40 - daysToGo / 7);
  return Math.max(1, Math.min(44, w));
}

function todayLabel(): string {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

// ─── Clerk appearance & localization ─────────────────────────────────────────

const clerkLocalization = {
  ...ptBR,
  signIn: { ...ptBR.signIn, start: { ...(ptBR.signIn?.start ?? {}), title: "Que bom ter você de volta", subtitle: "Entre para continuar preparando com calma." } },
  signUp: { ...ptBR.signUp, start: { ...(ptBR.signUp?.start ?? {}), title: "Crie seu espaço", subtitle: "Comece a organizar a chegada com leveza." } },
};

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: { logoPlacement: "inside" as const, logoLinkUrl: basePath || "/", logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: { colorPrimary: "#a453d1", colorForeground: "#24202a", colorMutedForeground: "#766f7d", colorDanger: "#c44c5c", colorBackground: "#ffffff", colorInput: "#f8f5fa", colorInputForeground: "#24202a", colorNeutral: "#e3dce8", fontFamily: "DM Sans, ui-sans-serif, sans-serif", borderRadius: "14px" },
  elements: { rootBox: "w-full max-w-[440px] flex justify-center", cardBox: "bg-white rounded-[24px] w-full overflow-hidden border border-[#e4d9ec] shadow-[0_24px_60px_rgba(81,57,99,0.16)]", card: "!shadow-none !border-0 !bg-transparent !rounded-none", footer: "!shadow-none !border-0 !bg-transparent !rounded-none", headerTitle: "text-[#24202a]", headerSubtitle: "text-[#766f7d]", socialButtonsBlockButtonText: "text-[#403847]", formFieldLabel: "text-[#51495a]", footerActionLink: "text-[#9b50c7]", footerActionText: "text-[#766f7d]", dividerText: "text-[#8c8493]", identityPreviewEditButton: "text-[#9b50c7]", formFieldSuccessText: "text-[#5e8e68]", alertText: "text-[#5c4351]", logoBox: "py-3", logoImage: "h-11 w-11 rounded-xl", socialButtonsBlockButton: "border-[#e3dce8] bg-[#fbf9fc] hover:bg-[#f5eef9]", formButtonPrimary: "bg-[#a453d1] hover:bg-[#9144bf] text-white", formFieldInput: "bg-[#f8f5fa] border-[#e3dce8] text-[#24202a]", footerAction: "bg-[#fbf9fc]", dividerLine: "bg-[#e5dfea]", alert: "bg-[#f9edf2]", otpCodeFieldInput: "bg-[#f8f5fa] border-[#e3dce8]", formFieldRow: "gap-2", main: "gap-4" },
};

// ─── Small UI primitives ──────────────────────────────────────────────────────

function Brand() {
  return (
    <div className="brand" data-testid="brand-ninho">
      <span className="brand-mark"><span /></span>
      <span className="brand-word">ninho</span>
    </div>
  );
}

function AccountControl() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const qc = useQueryClient();
  const name = user?.firstName || user?.username || "Você";
  const initials = name.slice(0, 2).toUpperCase();
  const handleSignOut = () => {
    // Clear all cached workspace data before redirecting so the next user
    // that signs in on this device cannot see stale data from this session.
    qc.clear();
    signOut({ redirectUrl: basePath || "/" });
  };
  return (
    <div className="account-control">
      <span className="toolbar-avatar">{initials}</span>
      <button type="button" onClick={handleSignOut} className="account-signout" data-testid="button-sign-out">
        <LogOut size={14} /> sair
      </button>
    </div>
  );
}

function TinyButton({ children, onClick, label, testId }: { children: ReactNode; onClick: () => void; label?: string; testId: string }) {
  return <button type="button" className="icon-button" onClick={onClick} aria-label={label} data-testid={testId}>{children}</button>;
}

function Pill({ active, children, onClick, testId }: { active?: boolean; children: ReactNode; onClick?: () => void; testId: string }) {
  return <button type="button" className={`pill ${active ? "pill-active" : ""}`} onClick={onClick} data-testid={testId}>{children}</button>;
}

function Progress({ value, className = "" }: { value: number; className?: string }) {
  return <div className={`progress-line ${className}`}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
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

// ─── Onboarding Modal ─────────────────────────────────────────────────────────

function OnboardingModal({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dueDate, setDueDateVal] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { displayName?: string; dueDate?: string | null; onboardingComplete: boolean }) =>
      updateProfile(data),
    onSuccess: (profile) => {
      qc.setQueryData<Workspace>(["workspace", userId], (old) => old ? { ...old, profile } : old);
      onComplete();
    },
  });

  const finish = () => {
    mutation.mutate({
      displayName: name.trim() || undefined,
      dueDate: dueDate || null,
      onboardingComplete: true,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card onboarding-card" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-progress">
          <span className={step >= 1 ? "step-active" : ""} />
          <span className={step >= 2 ? "step-active" : ""} />
        </div>

        {step === 1 && (
          <>
            <div className="modal-top">
              <div><span className="card-kicker">BEM-VINDA</span><h2>Como posso te chamar?</h2></div>
            </div>
            <p className="muted-copy">Não precisa ser seu nome completo — pode ser como preferir.</p>
            <label className="modal-label">
              SEU NOME OU APELIDO
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setStep(2)}
                placeholder="ex.: Ana, Duda, Mãe da Lara…"
                data-testid="input-onboarding-name"
              />
            </label>
            <div className="onboarding-actions">
              <button type="button" className="primary-button" onClick={() => setStep(2)} data-testid="button-onboarding-next">
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
              <div><span className="card-kicker">CHEGADA</span><h2>Qual é a data prevista?</h2></div>
              <TinyButton onClick={() => setStep(1)} label="Voltar" testId="button-onboarding-back"><ChevronRight size={17} className="rotate-180" /></TinyButton>
            </div>
            <p className="muted-copy">Usamos para calcular a sua semana e personalizar os marcos. Pode editar depois.</p>
            <label className="modal-label">
              DATA PROVÁVEL DO PARTO
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDateVal(e.target.value)}
                className="date-input"
                data-testid="input-onboarding-due-date"
              />
            </label>
            <div className="onboarding-actions">
              <button
                type="button"
                className="primary-button"
                onClick={finish}
                disabled={mutation.isPending}
                data-testid="button-onboarding-finish"
              >
                {mutation.isPending ? "Salvando…" : "Entrar no meu ninho"}
              </button>
              <button type="button" className="text-action" onClick={finish} disabled={mutation.isPending} data-testid="button-onboarding-skip-date">
                configurar depois
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Phone shell ──────────────────────────────────────────────────────────────

function Phone({ children, title, activeRoute, setLocation, activePanel, onPanel }: {
  children: ReactNode; title: string; activeRoute: string;
  setLocation: (path: string) => void; activePanel: number; onPanel: (index: number) => void;
}) {
  const tabs = [
    { path: "/dashboard", label: "Início", icon: Home, panel: 0 },
    { path: "/checklist", label: "Lista", icon: ListChecks, panel: 1 },
    { path: "/milestones", label: "Marcos", icon: History, panel: 2 },
    { path: "/profile", label: "Perfil", icon: UserRound, panel: 0 },
  ];
  const panelIdx = title === "Ninho" ? 0 : title === "Registro rápido" ? 1 : 2;
  return (
    <section className={`phone phone-${panelIdx} ${activePanel === panelIdx ? "is-mobile-active" : ""}`} aria-label={title}>
      <div className="phone-screen">
        <div className="status-row"><span>9:41</span><span className="status-icons"><span /><span /><span /></span></div>
        <div className="phone-header">
          <div className="phone-title">{title}</div>
          <TinyButton onClick={() => setLocation("/profile")} label="Abrir perfil" testId={`button-phone-profile-${activePanel}`}><MoreHorizontal size={17} /></TinyButton>
        </div>
        {children}
        <nav className="phone-tabs" aria-label="Navegação do Ninho">
          {tabs.map(({ path, label, icon: Icon, panel }) => {
            const selected = activeRoute === path;
            return (
              <button type="button" key={path} onClick={() => { onPanel(panel); setLocation(path); }} className={`phone-tab ${selected ? "tab-active" : ""}`} data-testid={`button-phone-tab-${label.toLowerCase()}`}>
                <Icon size={16} strokeWidth={selected ? 2 : 1.5} /><span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────

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
  const week = calcWeek(profile.dueDate);
  const spent = items.filter((i) => i.status !== "A comprar").reduce((s, i) => s + i.price, 0);
  const totalPlanned = budget.reduce((s, b) => s + parseFloat(b.planned), 0);
  const nextMilestone = miles.find((m) => !m.completed && (week === null || m.week >= (week ?? 0)));
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
    </div>
  );
}

function ChecklistPanel({
  items, onToggle, onAdd, onDelete,
}: {
  items: ChecklistItem[];
  onToggle: (id: number, current: ItemStatus) => void;
  onAdd: (category: CategoryKey) => void;
  onDelete: (id: number) => void;
}) {
  const [category, setCategory] = useState<CategoryKey>("Roupas");
  const visible = items.filter((i) => i.category === category);
  const allDone = items.filter((i) => i.status !== "A comprar").length;

  const nextStatus = (s: ItemStatus): ItemStatus =>
    s === "A comprar" ? "Comprado" : s === "Comprado" ? "Ganhei" : "A comprar";

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
        <div className="check-list">
          {visible.length === 0 && (
            <div className="empty-category">
              <p>Nenhum item em {category} ainda.</p>
              <button type="button" className="text-action" onClick={() => onAdd(category)} data-testid="button-phone-add-category-item">
                <Plus size={13} /> adicionar primeiro item
              </button>
            </div>
          )}
          {visible.map((item) => (
            <div className="check-item-row" key={item.id}>
              <button
                type="button"
                className="check-item"
                onClick={() => onToggle(item.id, nextStatus(item.status))}
                data-testid={`button-phone-check-${item.id}`}
              >
                <span className={`check-circle ${item.status !== "A comprar" ? "checked" : ""}`}>
                  {item.status === "Comprado" && <Check size={12} />}
                  {item.status === "Ganhei" && <Heart size={10} />}
                </span>
                <span className="check-name">
                  <strong>{item.name}</strong>
                  <small>{item.qty} un. · {item.status} {item.price > 0 ? `· ${money(item.price)}` : ""}</small>
                </span>
              </button>
              <button type="button" className="delete-item-btn" onClick={() => onDelete(item.id)} aria-label="Remover item" data-testid={`button-phone-delete-${item.id}`}>
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

function TimelinePanel({
  milestones: miles, profile, onToggle,
}: {
  milestones: ServerMilestone[];
  profile: ServerProfile;
  onToggle: (id: number, completed: boolean) => void;
}) {
  const week = calcWeek(profile.dueDate);
  const name = profile.displayName || "você";
  const progress = week ? Math.round((week / 40) * 100) : 0;

  return (
    <div className="phone-content flow">
      <div className="eyebrow-row">
        <span>{week ? `JORNADA DE ${name.toUpperCase()}` : "LINHA DO TEMPO"}</span>
        <span>{week ? `${week} / 40` : "—"}</span>
      </div>
      <h1 className="phone-heading">Os próximos<br /><strong>pequenos marcos.</strong></h1>

      {!profile.dueDate ? (
        <div className="empty-timeline">
          <CalendarDays size={28} />
          <p>Configure a data prevista no seu perfil para ver a linha do tempo personalizada.</p>
        </div>
      ) : (
        <div className="timeline-chart">
          <div className="chart-top"><span>PROGRESSO DA GESTAÇÃO</span><strong>{progress}%</strong></div>
          <div className="chart-bars">
            {[38, 56, 48, 76, 64, 92, 72].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} className={i === 5 ? "bar-current" : ""} />
            ))}
          </div>
          <div className="chart-foot">
            <span>sem {Math.max(1, (week ?? 24) - 4)}</span>
            <span>agora · sem {week ?? "—"}</span>
            <span>sem {(week ?? 24) + 4}</span>
          </div>
        </div>
      )}

      <div className="section-line"><span>Sua linha do tempo</span></div>
      <div className="milestone-list">
        {miles.map((m) => {
          const Icon = m.week <= 20 ? Sparkles : m.week <= 28 ? ClipboardCheck : m.week <= 32 ? Gift : Heart;
          const past = week !== null && m.week < (week ?? 0);
          return (
            <button
              type="button"
              className={`milestone-item ${m.completed ? "milestone-done" : ""} ${past && !m.completed ? "milestone-past" : ""}`}
              key={m.id}
              onClick={() => onToggle(m.id, !m.completed)}
              data-testid={`button-phone-milestone-${m.week}`}
            >
              <span className="milestone-icon"><Icon size={14} /></span>
              <span className="milestone-text">
                <small>SEMANA {m.week} · {m.note}</small>
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
  items, budget, onSave,
}: {
  items: ChecklistItem[];
  budget: ServerBudgetCategory[];
  onSave: (categories: Array<{ category: string; planned: number }>) => void;
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

  const spent = items.filter((i) => i.status !== "A comprar").reduce((s, i) => s + i.price, 0);
  const total = Object.values(planned).reduce((s, v) => s + v, 0);

  const handleChange = (cat: string, val: number) => {
    setPlanned((p) => ({ ...p, [cat]: val }));
    setDirty(true);
  };

  const save = () => {
    onSave(CATEGORIES.map((c) => ({ category: c, planned: planned[c] || 0 })));
    setDirty(false);
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
      <div className="white-card budget-list">
        <div className="card-head"><h2>Por categoria</h2><span className="card-kicker">EDITÁVEL</span></div>
        {CATEGORIES.map((cat) => (
          <label className="budget-row" key={cat}>
            <span>{cat}</span>
            <input
              type="number"
              value={planned[cat] ?? 0}
              onChange={(e) => handleChange(cat, Number(e.target.value) || 0)}
              data-testid={`input-phone-budget-${cat.toLowerCase()}`}
            />
          </label>
        ))}
        {dirty && (
          <button type="button" className="primary-button" style={{ marginTop: 12 }} onClick={save} data-testid="button-save-budget">
            <Check size={14} /> salvar orçamento
          </button>
        )}
      </div>
      <div className="log-card"><Pencil size={14} /> valores são uma bússola, não uma regra.</div>
    </div>
  );
}

function ProfilePanel({
  profile, onSave,
}: {
  profile: ServerProfile;
  onSave: (data: { displayName?: string; dueDate?: string | null; city?: string | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName || "");
  const [city, setCity] = useState(profile.city || "");
  const [dueDate, setDueDateVal] = useState(profile.dueDate || "");
  const { signOut } = useClerk();
  const qc = useQueryClient();

  useEffect(() => {
    setName(profile.displayName || "");
    setCity(profile.city || "");
    setDueDateVal(profile.dueDate || "");
  }, [profile]);

  const save = () => {
    onSave({ displayName: name.trim() || undefined, dueDate: dueDate || null, city: city.trim() || null });
    setEditing(false);
  };

  const initials = (profile.displayName || "?").slice(0, 2).toUpperCase();
  const week = calcWeek(profile.dueDate);

  return (
    <div className="phone-content flow">
      <div className="eyebrow-row">
        <span>SEU ESPAÇO</span>
        <TinyButton onClick={() => editing ? save() : setEditing(true)} label={editing ? "Salvar" : "Editar"} testId="button-phone-edit-profile">
          {editing ? <Check size={15} /> : <Pencil size={14} />}
        </TinyButton>
      </div>
      <h1 className="phone-heading">Tudo sobre<br /><strong>vocês dois.</strong></h1>
      <div className="profile-card">
        <div className="avatar">{initials}</div>
        <div>
          <h2>{profile.displayName || "Meu perfil"}</h2>
          <p>{week ? `semana ${week}` : "data prevista não configurada"}</p>
        </div>
        <Sparkles size={16} />
      </div>
      <div className="white-card profile-form">
        <label>
          SEU NOME
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={!editing} data-testid="input-phone-profile-name" />
        </label>
        <label>
          CIDADE
          <input value={city} onChange={(e) => setCity(e.target.value)} disabled={!editing} data-testid="input-phone-profile-city" />
        </label>
        <label>
          DATA PREVISTA DO PARTO
          <input type={editing ? "date" : "text"} value={editing ? dueDate : (profile.dueDate ? formatDate(profile.dueDate) : "Não configurada")} onChange={(e) => setDueDateVal(e.target.value)} disabled={!editing} className="date-input" data-testid="input-phone-profile-due-date" />
        </label>
        {profile.city && (
          <div className="profile-detail"><MapPin size={15} /><span>onde você está<strong>{profile.city}</strong></span></div>
        )}
        {profile.dueDate && (
          <div className="profile-detail"><CalendarDays size={15} /><span>data prevista<strong>{formatDate(profile.dueDate)}</strong></span></div>
        )}
        {editing && (
          <button type="button" className="primary-button" style={{ marginTop: 12 }} onClick={save} data-testid="button-save-profile">
            <Check size={14} /> salvar perfil
          </button>
        )}
      </div>
      <button
        type="button"
        className="soft-action"
        style={{ marginTop: 16, justifyContent: "center", gap: 8 }}
        onClick={() => { qc.clear(); signOut({ redirectUrl: basePath || "/" }); }}
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

function AddItemModal({ onClose, onAdd, category }: { onClose: () => void; onAdd: (name: string, category: CategoryKey) => void; category: CategoryKey }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState<CategoryKey>(category);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div><span className="card-kicker">SUA LISTA, SUAS REGRAS</span><h2>Adicionar item</h2></div>
          <TinyButton onClick={onClose} label="Fechar" testId="button-close-add-item"><X size={17} /></TinyButton>
        </div>
        <div className="filter-row" style={{ marginBottom: 12 }}>
          {CATEGORIES.map((k) => <Pill key={k} active={cat === k} onClick={() => setCat(k)} testId={`button-modal-cat-${k}`}>{k}</Pill>)}
        </div>
        <label className="modal-label">
          NOME DO ITEM
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && onAdd(name.trim(), cat)} placeholder="ex.: manta para o carrinho" data-testid="input-new-item" />
        </label>
        <p>Este item entra em <strong>{cat}</strong>.</p>
        <button type="button" className="primary-button" onClick={() => name.trim() && onAdd(name.trim(), cat)} disabled={!name.trim()} data-testid="button-confirm-add-item">
          <Plus size={15} /> colocar na lista
        </button>
      </div>
    </div>
  );
}

// ─── Desktop layout ───────────────────────────────────────────────────────────

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
  const week = calcWeek(profile.dueDate);
  const nextMilestone = miles.find((m) => !m.completed && (week === null || m.week >= (week ?? 0)));
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
  const titles: Record<string, string> = { "/dashboard": "Visão geral", "/checklist": "Minha lista", "/milestones": "Linha do tempo", "/budget": "Orçamento", "/profile": "Meu perfil" };
  const title = titles[location] ?? "Ninho";
  const isOverview = location === "/dashboard";
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
            <AccountControl />
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
        <div className={`desktop-content-grid ${isOverview ? "" : "desktop-content-grid-single"}`}>
          <section className="desktop-primary"><div className="desktop-panel-surface">{content}</div></section>
          {isOverview && <DesktopSideSummary items={items} milestones={miles} profile={profile} go={go} />}
        </div>
      </main>
    </div>
  );
}

// ─── Workspace (authenticated shell) ─────────────────────────────────────────

function Workspace() {
  const { getToken, userId } = useAuth();
  // userId is always a non-null string here because Workspace is only rendered
  // when isSignedIn=true. We cast once so the rest of the component can use
  // it safely without optional-chaining noise.
  const uid = userId as string;
  const qc = useQueryClient();

  // When the signed-in user changes (e.g. same browser, different account),
  // remove all workspace cache entries so the new user starts fresh.
  useEffect(() => {
    return () => {
      qc.removeQueries({ queryKey: ["workspace"] });
    };
  }, [uid, qc]);

  // Initialize auth token getter for customFetch
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  // Scope every cache entry by userId so different accounts in the same
  // browser session can never share cached workspace data.
  const wqKey = ["workspace", uid] as const;

  const workspaceQuery = useQuery({
    queryKey: wqKey,
    queryFn: fetchWorkspace,
    staleTime: 60_000,
  });

  const [location, setLocation] = useLocation();
  const [desktopView, setDesktopView] = useState(() => window.innerWidth > 900);
  const [activePanel, setActivePanel] = useState(location === "/checklist" ? 1 : location === "/milestones" ? 2 : 0);
  const [addOpen, setAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<CategoryKey>("Roupas");

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
    },
  });

  const addItemMutation = useMutation({
    mutationFn: createChecklistItem,
    onSuccess: (item) => {
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: [...old.items, item] } : old,
      );
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status?: ItemStatus; qty?: number } }) =>
      updateChecklistItem(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: wqKey });
      const prev = qc.getQueryData<Workspace>(wqKey);
      qc.setQueryData<Workspace>(wqKey, (old) =>
        old ? { ...old, items: old.items.map((i) => i.id === id ? { ...i, ...data } : i) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(wqKey, ctx.prev);
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
    },
    onSettled: () => qc.invalidateQueries({ queryKey: wqKey }),
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
    },
    onSettled: () => qc.invalidateQueries({ queryKey: wqKey }),
  });

  const budgetMutation = useMutation({
    mutationFn: (categories: Array<{ category: string; planned: number }>) =>
      updateBudget({ categories }),
    onSuccess: (budget) => {
      qc.setQueryData<Workspace>(wqKey, (old) => old ? { ...old, budget } : old);
    },
  });

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

  const { profile, items: rawItems, milestones: miles, budget } = workspaceQuery.data;
  const items = rawItems.map(adaptItem);

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

  const handleAddItem = (name: string, cat: CategoryKey) => {
    addItemMutation.mutate({ name, category: cat });
    setAddOpen(false);
  };

  const handleToggle = (id: number, status: ItemStatus) => {
    updateItemMutation.mutate({ id, data: { status } });
  };

  const handleDelete = (id: number) => {
    deleteItemMutation.mutate(id);
  };

  const handleMilestoneToggle = (id: number, completed: boolean) => {
    milestoneMutation.mutate({ id, completed });
  };

  const handleProfileSave = (data: { displayName?: string; dueDate?: string | null; city?: string | null }) => {
    profileMutation.mutate(data);
  };

  const handleBudgetSave = (cats: Array<{ category: string; planned: number }>) => {
    budgetMutation.mutate(cats);
  };

  // ── Panel content ────────────────────────────────────────────────────────

  const overviewPanel = (
    <OverviewPanel items={items} profile={profile} milestones={miles} budget={budget}
      setLocation={(p) => go(p, p === "/checklist" ? 1 : p === "/milestones" ? 2 : 0)}
    />
  );
  const checklistPanel = (
    <ChecklistPanel items={items} onToggle={handleToggle} onAdd={openAdd} onDelete={handleDelete} />
  );
  const milestonePanel = (
    <TimelinePanel milestones={miles} profile={profile} onToggle={handleMilestoneToggle} />
  );
  const budgetPanel = <BudgetPanel items={items} budget={budget} onSave={handleBudgetSave} />;
  const profilePanel = <ProfilePanel profile={profile} onSave={handleProfileSave} />;

  const desktopContent = location === "/checklist" ? checklistPanel
    : location === "/milestones" ? milestonePanel
    : location === "/budget" ? budgetPanel
    : location === "/profile" ? profilePanel
    : overviewPanel;

  // ── Desktop layout ───────────────────────────────────────────────────────

  if (desktopView) {
    return (
      <div className="ninho-app">
        <DesktopWorkspace location={location} go={go} items={items} milestones={miles} profile={profile} budget={budget} content={desktopContent} />
        {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onAdd={handleAddItem} category={addCategory} />}
      </div>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────

  const panelOne = location === "/budget" ? budgetPanel : location === "/profile" ? profilePanel : overviewPanel;
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
        <div className="toolbar-actions"><AccountControl /></div>
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
      <div className="mobile-panel-switcher">
        {[0, 1, 2].map((i) => (
          <button key={i} type="button" className={`panel-dot ${activePanel === i ? "dot-active" : ""}`} onClick={() => setActivePanel(i)} aria-label={`Painel ${i + 1}`} />
        ))}
      </div>
      {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onAdd={handleAddItem} category={addCategory} />}
    </div>
  );
}

// ─── Auth pages ───────────────────────────────────────────────────────────────

function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <Brand />
        <img src={loginHeroImage} alt="" className="auth-hero-image" aria-hidden />
        <div className="auth-copy">
          <span className="desktop-eyebrow">ORGANIZAÇÃO DE ENXOVAL</span>
          <h1>Prepare a chegada<br /><strong>com leveza.</strong></h1>
          <p>Checklists, orçamento e linha do tempo — tudo no seu ritmo.</p>
        </div>
      </div>
      <div className="auth-clerk">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <Brand />
        <img src={loginHeroImage} alt="" className="auth-hero-image" aria-hidden />
        <div className="auth-copy">
          <span className="desktop-eyebrow">ORGANIZAÇÃO DE ENXOVAL</span>
          <h1>Prepare a chegada<br /><strong>com leveza.</strong></h1>
          <p>Checklists, orçamento e linha do tempo — tudo no seu ritmo.</p>
        </div>
      </div>
      <div className="auth-clerk">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

function AuthenticatedApp() {
  const [location] = useLocation();
  if (location === "/") return <Redirect to="/dashboard" />;
  return <Workspace />;
}

function AppRouter() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="ninho-app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/sso-callback" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/sign-up/sso-callback" component={SignUpPage} />
      <Route path="/"><Redirect to={isSignedIn ? "/dashboard" : "/sign-in"} /></Route>
      {isSignedIn ? (
        <Route path="/:rest*" component={AuthenticatedApp} />
      ) : (
        <Route path="/:rest*"><Redirect to="/sign-in" /></Route>
      )}
    </Switch>
  );
}

function ClerkApp() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      localization={clerkLocalization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  if (!clerkPubKey) throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set");
  return (
    <WouterRouter base={basePath}>
      <ClerkApp />
    </WouterRouter>
  );
}
