import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
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
  Copy,
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
  Share2,
  Sparkles,
  Star,
  UserRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

type CategoryKey = "Roupas" | "Higiene" | "Alimentação" | "Acessórios";
type ItemStatus = "A comprar" | "Comprado" | "Ganhei";
type ChecklistItem = {
  id: number;
  name: string;
  category: CategoryKey;
  group: string;
  qty: number;
  owned: number;
  status: ItemStatus;
  price: number;
  essential?: boolean;
};

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const loginHeroImage = `${basePath}/login-pregnancy.png`;
const clerkLocalization = {
  ...ptBR,
  signIn: {
    ...ptBR.signIn,
    start: {
      ...(ptBR.signIn?.start ?? {}),
      title: "Que bom ter você de volta",
      subtitle: "Entre para continuar preparando com calma.",
    },
  },
  signUp: {
    ...ptBR.signUp,
    start: {
      ...(ptBR.signUp?.start ?? {}),
      title: "Crie seu espaço",
      subtitle: "Comece a organizar a chegada com leveza.",
    },
  },
};
const categories: CategoryKey[] = ["Roupas", "Higiene", "Alimentação", "Acessórios"];
const initialItems: ChecklistItem[] = [
  { id: 1, name: "Body manga curta", category: "Roupas", group: "RN · essenciais", qty: 6, owned: 4, status: "Comprado", price: 38, essential: true },
  { id: 2, name: "Macacão de algodão", category: "Roupas", group: "0–3 meses", qty: 5, owned: 2, status: "A comprar", price: 74, essential: true },
  { id: 3, name: "Cueiro leve", category: "Roupas", group: "Primeiros dias", qty: 3, owned: 1, status: "Ganhei", price: 42 },
  { id: 4, name: "Toalha com capuz", category: "Higiene", group: "Banho", qty: 2, owned: 1, status: "Comprado", price: 58, essential: true },
  { id: 5, name: "Fralda de pano", category: "Higiene", group: "Troca", qty: 8, owned: 3, status: "A comprar", price: 12, essential: true },
  { id: 6, name: "Kit primeiros cuidados", category: "Higiene", group: "Farmacinha", qty: 1, owned: 0, status: "A comprar", price: 96 },
  { id: 7, name: "Mamadeira anticólica", category: "Alimentação", group: "Apoio", qty: 2, owned: 0, status: "A comprar", price: 64 },
  { id: 8, name: "Babador de tecido", category: "Alimentação", group: "Dia a dia", qty: 5, owned: 2, status: "Comprado", price: 16 },
  { id: 9, name: "Trocador portátil", category: "Acessórios", group: "Passeio", qty: 1, owned: 0, status: "A comprar", price: 88 },
  { id: 10, name: "Bolsa da maternidade", category: "Acessórios", group: "Maternidade", qty: 1, owned: 1, status: "Ganhei", price: 310, essential: true },
];

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const iconForCategory = (category: CategoryKey) =>
  category === "Alimentação" ? Utensils : category === "Higiene" ? ClipboardCheck : category === "Acessórios" ? Sparkles : Heart;

function Brand() {
  return (
    <div className="brand" data-testid="brand-ninho">
      <span className="brand-mark"><span /></span>
      <span className="brand-word">ninho</span>
    </div>
  );
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#a453d1",
    colorForeground: "#24202a",
    colorMutedForeground: "#766f7d",
    colorDanger: "#c44c5c",
    colorBackground: "#ffffff",
    colorInput: "#f8f5fa",
    colorInputForeground: "#24202a",
    colorNeutral: "#e3dce8",
    fontFamily: "DM Sans, ui-sans-serif, sans-serif",
    borderRadius: "14px",
  },
  elements: {
    rootBox: "w-full max-w-[440px] flex justify-center",
    cardBox: "bg-white rounded-[24px] w-full overflow-hidden border border-[#e4d9ec] shadow-[0_24px_60px_rgba(81,57,99,0.16)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#24202a]",
    headerSubtitle: "text-[#766f7d]",
    socialButtonsBlockButtonText: "text-[#403847]",
    formFieldLabel: "text-[#51495a]",
    footerActionLink: "text-[#9b50c7]",
    footerActionText: "text-[#766f7d]",
    dividerText: "text-[#8c8493]",
    identityPreviewEditButton: "text-[#9b50c7]",
    formFieldSuccessText: "text-[#5e8e68]",
    alertText: "text-[#5c4351]",
    logoBox: "py-3",
    logoImage: "h-11 w-11 rounded-xl",
    socialButtonsBlockButton: "border-[#e3dce8] bg-[#fbf9fc] hover:bg-[#f5eef9]",
    formButtonPrimary: "bg-[#a453d1] hover:bg-[#9144bf] text-white",
    formFieldInput: "bg-[#f8f5fa] border-[#e3dce8] text-[#24202a]",
    footerAction: "bg-[#fbf9fc]",
    dividerLine: "bg-[#e5dfea]",
    alert: "bg-[#f9edf2]",
    otpCodeFieldInput: "bg-[#f8f5fa] border-[#e3dce8]",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function AccountControl() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const name = user?.firstName || user?.username || "Você";
  const initials = name.slice(0, 2).toUpperCase();
  return <div className="account-control"><span className="toolbar-avatar">{initials}</span><button type="button" onClick={() => signOut({ redirectUrl: basePath || "/" })} className="account-signout" data-testid="button-sign-out"><LogOut size={14} /> sair</button></div>;
}

function TinyButton({ children, onClick, label, testId }: { children: ReactNode; onClick: () => void; label?: string; testId: string }) {
  return <button type="button" className="icon-button" onClick={onClick} aria-label={label} data-testid={testId}>{children}</button>;
}

function Pill({ active, children, onClick, testId }: { active?: boolean; children: ReactNode; onClick?: () => void; testId: string }) {
  return <button type="button" className={`pill ${active ? "pill-active" : ""}`} onClick={onClick} data-testid={testId}>{children}</button>;
}

function Progress({ value, className = "" }: { value: number; className?: string }) {
  return <div className={`progress-line ${className}`}><span style={{ width: `${Math.min(100, value)}%` }} /></div>;
}

function Phone({ children, title, activeRoute, setLocation, activePanel, onPanel }: {
  children: ReactNode;
  title: string;
  activeRoute: string;
  setLocation: (path: string) => void;
  activePanel: number;
  onPanel: (index: number) => void;
}) {
  const tabs = [
    { path: "/dashboard", label: "Início", icon: Home, panel: 0 },
    { path: "/checklist", label: "Lista", icon: ListChecks, panel: 1 },
    { path: "/milestones", label: "Marcos", icon: History, panel: 2 },
    { path: "/profile", label: "Perfil", icon: UserRound, panel: 0 },
  ];
  return (
    <section className={`phone phone-${title === "Ninho" ? 0 : title === "Registro rápido" ? 1 : 2} ${activePanel === (title === "Ninho" ? 0 : title === "Registro rápido" ? 1 : 2) ? "is-mobile-active" : ""}`} aria-label={title}>
      <div className="phone-screen">
        <div className="status-row"><span>9:41</span><span className="status-icons"><span /><span /><span /></span></div>
        <div className="phone-header">
          <div className="phone-title">{title}</div>
          <TinyButton onClick={() => setLocation("/profile")} label="Abrir perfil" testId={`button-phone-profile-${activePanel}`}><MoreHorizontal size={17} /></TinyButton>
        </div>
        {children}
        <nav className="phone-tabs" aria-label="Navegação do Ninho">
          {tabs.map(({ path, label, icon: Icon, panel }) => {
            const selected = activeRoute === path || (path === "/milestones" && (activeRoute === "/shower"));
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

function OverviewPanel({ items, setLocation }: { items: ChecklistItem[]; setLocation: (path: string) => void }) {
  const done = items.filter((item) => item.status !== "A comprar").length;
  const score = Math.round((done / items.length) * 100);
  return (
    <div className="phone-content flow">
      <div className="eyebrow-row"><span>terça-feira, 12 de março</span><span className="live-dot" /></div>
      <h1 className="phone-heading">Seu caminho,<br /><strong>um passo de cada vez.</strong></h1>
      <div className="focus-card">
        <div className="focus-copy"><span className="card-kicker">PREPARAÇÃO</span><strong>{score}%</strong><span>do enxoval já tomou forma</span><Progress value={score} /></div>
        <div className="orbit-illustration" aria-label="Referência de quarto do bebê"><img src={`${import.meta.env.BASE_URL}images/quarto-bebe.jpg`} alt="Quarto de bebê claro e acolhedor" /><i /><b /><em><span>{done}</span><small>de {items.length}</small></em></div>
      </div>
      <div className="section-line"><span>Visão geral</span><button type="button" onClick={() => setLocation("/checklist")} data-testid="button-open-overview-list">ver lista <ChevronRight size={13} /></button></div>
      <div className="white-card">
        <div className="card-head"><div><span className="card-kicker">FOCO DA SEMANA</span><h2>Roupas RN</h2></div><div className="round-icon"><Heart size={15} /></div></div>
        <p className="muted-copy">Peças macias para os primeiros dias, sem excesso.</p>
        <div className="mini-stat"><span><CheckCircle2 size={14} /> 4 de 6 resolvidos</span><span>68%</span></div>
        <Progress value={68} />
      </div>
      <div className="two-stat-grid">
        <button type="button" className="white-card compact-card" onClick={() => setLocation("/milestones")} data-testid="button-open-overview-milestones"><span className="card-kicker">PRÓXIMO MARCO</span><strong>Semana 28</strong><span className="muted-copy">fechar roupas RN</span><ChevronRight size={14} /></button>
        <button type="button" className="white-card compact-card" onClick={() => setLocation("/budget")} data-testid="button-open-overview-budget"><span className="card-kicker">ORÇAMENTO</span><strong>{money(1374)}</strong><span className="muted-copy">investido até aqui</span><ChevronRight size={14} /></button>
      </div>
      <button type="button" className="soft-action" onClick={() => setLocation("/shower")} data-testid="button-open-overview-shower"><Gift size={15} /> organizar chá de bebê <ChevronRight size={14} /></button>
    </div>
  );
}

function ChecklistPanel({ items, setItems, onAdd }: { items: ChecklistItem[]; setItems: Dispatch<SetStateAction<ChecklistItem[]>>; onAdd: () => void }) {
  const [category, setCategory] = useState<CategoryKey>("Roupas");
  const visible = items.filter((item) => item.category === category).slice(0, 5);
  const cycle = (id: number) => setItems((current) => current.map((item) => {
    if (item.id !== id) return item;
    const status: ItemStatus = item.status === "A comprar" ? "Comprado" : item.status === "Comprado" ? "Ganhei" : "A comprar";
    return { ...item, status, owned: status === "A comprar" ? 0 : item.qty };
  }));
  return (
    <div className="phone-content flow">
      <div className="eyebrow-row"><span>LISTA DE PREPARO</span><span className="count-badge">{items.filter((item) => item.status !== "A comprar").length}/{items.length}</span></div>
      <h1 className="phone-heading">Tudo no lugar,<br /><strong>na hora certa.</strong></h1>
      <div className="filter-row">
        {categories.map((key) => <Pill key={key} active={category === key} onClick={() => setCategory(key)} testId={`button-phone-category-${key.toLowerCase()}`}>{key}</Pill>)}
      </div>
      <div className="activity-card">
        <div className="card-head"><div><span className="card-kicker">CHECKLIST ATIVO</span><h2>{category}</h2></div><TinyButton onClick={onAdd} label="Adicionar item" testId="button-phone-add-item"><Plus size={16} /></TinyButton></div>
        <div className="check-list">
          {visible.map((item) => (
            <button type="button" className="check-item" key={item.id} onClick={() => cycle(item.id)} data-testid={`button-phone-check-${item.id}`}>
              <span className={`check-circle ${item.status !== "A comprar" ? "checked" : ""}`}>{item.status !== "A comprar" && <Check size={12} />}</span>
              <span className="check-name"><strong>{item.name}</strong><small>{item.qty} un. · {item.status}</small></span>
              <ChevronRight size={14} className="row-arrow" />
            </button>
          ))}
        </div>
        <button type="button" className="text-action" onClick={onAdd} data-testid="button-phone-add-list-item"><Plus size={13} /> adicionar item</button>
      </div>
      <div className="log-card"><div className="log-title"><Activity size={15} /> atividade de hoje</div><div className="log-row"><span className="log-dot" /><span>Body manga curta marcado como comprado</span><small>agora</small></div><div className="log-row"><span className="log-dot dim" /><span>Seu ritmo está constante</span><small>08:40</small></div></div>
    </div>
  );
}

function TimelinePanel({ setLocation, completed, setCompleted }: { setLocation: (path: string) => void; completed: number[]; setCompleted: Dispatch<SetStateAction<number[]>> }) {
  const milestones = [
    { week: 20, title: "Defina o estilo do quarto", note: "feito com calma", icon: Sparkles },
    { week: 28, title: "Feche a lista de roupas RN", note: "seu momento", icon: ClipboardCheck },
    { week: 32, title: "Organize o chá de bebê", note: "a seguir", icon: Gift },
    { week: 36, title: "Mala da maternidade pronta", note: "mais à frente", icon: Heart },
  ];
  return (
    <div className="phone-content flow">
      <div className="eyebrow-row"><span>JORNADA DA MARINA</span><span>24 / 40</span></div>
      <h1 className="phone-heading">Os próximos<br /><strong>pequenos marcos.</strong></h1>
      <div className="timeline-chart">
        <div className="chart-top"><span>PROGRESSO DA GESTAÇÃO</span><strong>60%</strong></div>
        <div className="chart-bars">{[38, 56, 48, 76, 64, 92, 72].map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index === 5 ? "bar-current" : ""} />)}</div>
        <div className="chart-foot"><span>sem 20</span><span>agora · sem 24</span><span>sem 28</span></div>
      </div>
      <div className="section-line"><span>Hoje na sua linha do tempo</span><button type="button" onClick={() => setLocation("/shower")} data-testid="button-phone-open-shower">chá <ChevronRight size={13} /></button></div>
      <div className="milestone-list">
        {milestones.map(({ week, title, note, icon: Icon }) => {
          const done = completed.includes(week);
          return <button type="button" className={`milestone-item ${done ? "milestone-done" : ""}`} key={week} onClick={() => week === 28 && setCompleted((current) => current.includes(week) ? current.filter((value) => value !== week) : [...current, week])} data-testid={`button-phone-milestone-${week}`}>
            <span className="milestone-icon"><Icon size={14} /></span><span className="milestone-text"><small>SEMANA {week} · {note}</small><strong>{title}</strong></span>{done ? <CheckCircle2 size={16} /> : <ChevronRight size={15} />}
          </button>;
        })}
      </div>
    </div>
  );
}

function ShowerPanel({ setLocation }: { setLocation: (path: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [eventDate, setEventDate] = useState("2025-10-18");
  const copy = () => { navigator.clipboard?.writeText("ninho.app/cha/marina-lima-24"); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <div className="phone-content flow"><div className="eyebrow-row"><span>CHÁ DE BEBÊ</span><span className="purple-dot"><Gift size={12} /></span></div><h1 className="phone-heading">Dividir também<br /><strong>é uma forma de cuidar.</strong></h1><div className="shower-hero"><img className="shower-photo" src={`${import.meta.env.BASE_URL}images/berco-bebe.jpg`} alt="Quarto preparado para a chegada do bebê" /><div className="shower-copy"><span className="card-kicker">LISTA COMPARTILHÁVEL</span><h2>Um encontro<br />para chegar perto.</h2><p>Quem ama vocês escolhe como participar.</p></div><div className="abstract-gift"><Gift size={24} /></div></div><div className="white-card"><div className="card-head"><div><span className="card-kicker">DATA DO ENCONTRO</span><h2>18 de outubro</h2></div><CalendarDays size={17} /></div><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="date-input" data-testid="input-phone-event-date" /><button type="button" className="share-button" onClick={copy} data-testid="button-phone-copy-share">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "link copiado" : "copiar link da lista"}<Share2 size={14} /></button></div><button type="button" className="soft-action" onClick={() => setLocation("/checklist")} data-testid="button-phone-shower-list"><Gift size={15} /> ver itens disponíveis <ChevronRight size={14} /></button></div>;
}

function BudgetPanel({ items }: { items: ChecklistItem[] }) {
  const [planned, setPlanned] = useState<Record<CategoryKey, number>>({ Roupas: 1240, Higiene: 680, Alimentação: 520, Acessórios: 940 });
  const spent = items.filter((item) => item.status !== "A comprar").reduce((sum, item) => sum + item.price, 0);
  const total = Object.values(planned).reduce((sum, value) => sum + value, 0);
  return <div className="phone-content flow"><div className="eyebrow-row"><span>CLAREZA SEM PLANILHA</span><WalletCards size={14} /></div><h1 className="phone-heading">Um olhar calmo<br /><strong>para o orçamento.</strong></h1><div className="budget-total"><span className="card-kicker">INVESTIDO ATÉ AQUI</span><strong>{money(spent)}</strong><small>de {money(total)} planejados</small><Progress value={(spent / total) * 100} /></div><div className="white-card budget-list"><div className="card-head"><h2>Por categoria</h2><span className="card-kicker">EDITÁVEL</span></div>{categories.map((category) => <label className="budget-row" key={category}><span>{category}</span><input type="number" value={planned[category]} onChange={(event) => setPlanned((current) => ({ ...current, [category]: Number(event.target.value) || 0 }))} data-testid={`input-phone-budget-${category.toLowerCase()}`} /></label>)}</div><div className="log-card"><Pencil size={14} /> valores são uma bússola, não uma regra.</div></div>;
}

function ProfilePanel() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Marina Lima");
  const [city, setCity] = useState("São Paulo, SP");
  return <div className="phone-content flow"><div className="eyebrow-row"><span>SEU ESPAÇO</span><TinyButton onClick={() => setEditing((value) => !value)} label="Editar perfil" testId="button-phone-edit-profile">{editing ? <Check size={15} /> : <Pencil size={14} />}</TinyButton></div><h1 className="phone-heading">Tudo sobre<br /><strong>vocês dois.</strong></h1><div className="profile-card"><div className="avatar">ML</div><div><h2>{name}</h2><p>primeira gestação · semana 24</p></div><Sparkles size={16} /></div><div className="white-card profile-form"><label>SEU NOME<input value={name} onChange={(event) => setName(event.target.value)} disabled={!editing} data-testid="input-phone-profile-name" /></label><label>CIDADE<input value={city} onChange={(event) => setCity(event.target.value)} disabled={!editing} data-testid="input-phone-profile-city" /></label><div className="profile-detail"><CalendarDays size={15} /><span>data prevista<strong>22 de novembro de 2025</strong></span></div><div className="profile-detail"><MapPin size={15} /><span>onde você está<strong>{city}</strong></span></div></div><div className="soft-action"><Star size={15} /> o que é essencial pode ser simples.</div></div>;
}

function AddItemModal({ onClose, onAdd, category }: { onClose: () => void; onAdd: (name: string) => void; category: CategoryKey }) {
  const [name, setName] = useState("");
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-top"><div><span className="card-kicker">SUA LISTA, SUAS REGRAS</span><h2>Adicionar item</h2></div><TinyButton onClick={onClose} label="Fechar" testId="button-close-add-item"><X size={17} /></TinyButton></div><label className="modal-label">NOME DO ITEM<input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && name.trim() && onAdd(name.trim())} placeholder="ex.: manta para o carrinho" data-testid="input-new-item" /></label><p>Este item entra em <strong>{category}</strong>.</p><button type="button" className="primary-button" onClick={() => name.trim() && onAdd(name.trim())} disabled={!name.trim()} data-testid="button-confirm-add-item"><Plus size={15} /> colocar na lista</button></div></div>;
}

function DesktopSidebar({ location, go }: { location: string; go: (path: string, panel?: number) => void }) {
  const links = [
    { path: "/dashboard", label: "Visão geral", icon: Home, panel: 0 },
    { path: "/checklist", label: "Minha lista", icon: ListChecks, panel: 1 },
    { path: "/milestones", label: "Linha do tempo", icon: History, panel: 2 },
  ];
  return <aside className="desktop-sidebar">
    <div className="desktop-sidebar-brand"><Brand /><span>gestão de enxoval</span></div>
    <div className="desktop-nav-label">SEU NINHO</div>
    <nav className="desktop-nav" aria-label="Navegação principal">
      {links.map(({ path, label, icon: Icon, panel }) => {
        const selected = location === path || (path === "/milestones" && location === "/shower");
        return <button type="button" key={path} className={`desktop-nav-item ${selected ? "selected" : ""}`} onClick={() => go(path, panel)} data-testid={`button-desktop-nav-${label.toLowerCase().replaceAll(" ", "-")}`}><Icon size={17} /><span>{label}</span>{selected && <span className="desktop-nav-indicator" />}</button>;
      })}
    </nav>
    <div className="desktop-nav-label desktop-secondary-label">ORGANIZAÇÃO</div>
    <nav className="desktop-nav">
      <button type="button" className={`desktop-nav-item ${location === "/budget" ? "selected" : ""}`} onClick={() => go("/budget", 0)} data-testid="button-desktop-nav-orcamento"><WalletCards size={17} /><span>Orçamento</span></button>
      <button type="button" className={`desktop-nav-item ${location === "/profile" ? "selected" : ""}`} onClick={() => go("/profile", 0)} data-testid="button-desktop-nav-perfil"><UserRound size={17} /><span>Meu perfil</span></button>
    </nav>
    <div className="desktop-sidebar-footer"><div className="desktop-footer-orbit"><Sparkles size={15} /></div><div><strong>Um passo de cada vez.</strong><span>sem pressa, sem excesso</span></div></div>
  </aside>;
}

function DesktopSideSummary({ items, go }: { items: ChecklistItem[]; go: (path: string, panel?: number) => void }) {
  const done = items.filter((item) => item.status !== "A comprar").length;
  const score = Math.round((done / items.length) * 100);
  return <aside className="desktop-side">
    <div className="desktop-side-card desktop-next-card">
      <div className="desktop-side-card-top"><span className="card-kicker">PRÓXIMO PASSO</span><span className="desktop-side-icon"><ChevronRight size={15} /></span></div>
      <h3>Fechar as roupas RN</h3>
      <p>Você já resolveu 4 de 6 peças essenciais para os primeiros dias.</p>
      <Progress value={68} />
      <button type="button" className="desktop-text-button" onClick={() => go("/checklist", 1)} data-testid="button-desktop-next-step">abrir checklist <ArrowUpRight size={14} /></button>
    </div>
    <div className="desktop-side-card">
      <div className="desktop-side-card-top"><span className="card-kicker">SEU PROGRESSO</span><span className="desktop-progress-number">{score}%</span></div>
      <div className="desktop-progress-row"><strong>{done}</strong><span>itens já resolvidos<br />de {items.length} no total</span></div>
      <div className="desktop-mini-bars"><i style={{ height: "58%" }} /><i style={{ height: "73%" }} /><i className="current" style={{ height: `${Math.max(35, score)}%` }} /><i style={{ height: "44%" }} /><i style={{ height: "64%" }} /></div>
    </div>
    <button type="button" className="desktop-share-card" onClick={() => go("/shower", 2)} data-testid="button-desktop-open-shower"><span className="desktop-share-icon"><Gift size={18} /></span><span><strong>Chá de bebê</strong><small>organize junto com quem ama vocês</small></span><ChevronRight size={16} /></button>
  </aside>;
}

function DesktopWorkspace({ location, go, items, content }: { location: string; go: (path: string, panel?: number) => void; items: ChecklistItem[]; content: ReactNode }) {
  const title = location === "/dashboard" ? "Visão geral" : location === "/checklist" ? "Minha lista" : location === "/milestones" || location === "/shower" ? "Linha do tempo" : location === "/budget" ? "Orçamento" : "Meu perfil";
  const isOverview = location === "/dashboard";
  return <div className="desktop-workspace">
    <DesktopSidebar location={location} go={go} />
    <main className="desktop-main">
      <header className="desktop-header"><div><span className="desktop-greeting">terça-feira, 12 de março</span><h1>{title}</h1></div><div className="desktop-header-actions"><button type="button" className="desktop-help-button"><Sparkles size={15} /> seu espaço, do seu jeito</button><AccountControl /></div></header>
      {isOverview && <section className="desktop-welcome"><div><span className="desktop-eyebrow">BEM-VINDA DE VOLTA, MARINA</span><h2>Seu caminho está tomando forma.</h2><p>Uma visão tranquila do que já foi resolvido e do que vem a seguir.</p></div><div className="desktop-welcome-score"><span>PREPARAÇÃO</span><strong>{Math.round((items.filter((item) => item.status !== "A comprar").length / items.length) * 100)}%</strong><small>do enxoval resolvido</small></div></section>}
      <div className={`desktop-content-grid ${isOverview ? "" : "desktop-content-grid-single"}`}><section className="desktop-primary"><div className="desktop-panel-surface">{content}</div></section>{isOverview && <DesktopSideSummary items={items} go={go} />}</div>
    </main>
  </div>;
}

function Workspace() {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [location, setLocation] = useLocation();
  const [desktopView, setDesktopView] = useState(() => window.innerWidth > 900);
  const [activePanel, setActivePanel] = useState(location === "/checklist" ? 1 : location === "/milestones" || location === "/shower" ? 2 : 0);
  const [addOpen, setAddOpen] = useState(false);
  const [milestones, setMilestones] = useState<number[]>([20]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const syncViewport = () => setDesktopView(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);
  const addItem = (name: string) => { setItems((current) => [...current, { id: Date.now(), name, category: "Roupas", group: "Adicionado por você", qty: 1, owned: 0, status: "A comprar", price: 0 }]); setAddOpen(false); };
  const go = (path: string, panel?: number) => { if (panel !== undefined) setActivePanel(panel); setLocation(path); };
  const panelOne = location === "/budget" ? <BudgetPanel items={items} /> : location === "/profile" ? <ProfilePanel /> : <OverviewPanel items={items} setLocation={(path) => go(path, path === "/checklist" ? 1 : path === "/milestones" || path === "/shower" ? 2 : 0)} />;
  const panelTwo = location === "/checklist" ? <ChecklistPanel items={items} setItems={setItems} onAdd={() => setAddOpen(true)} /> : <ChecklistPanel items={items} setItems={setItems} onAdd={() => setAddOpen(true)} />;
  const panelThree = location === "/shower" ? <ShowerPanel setLocation={(path) => go(path, path === "/checklist" ? 1 : 2)} /> : <TimelinePanel setLocation={(path) => go(path, 2)} completed={milestones} setCompleted={setMilestones} />;
  const desktopContent = location === "/dashboard" ? <OverviewPanel items={items} setLocation={(path) => go(path, path === "/checklist" ? 1 : path === "/milestones" || path === "/shower" ? 2 : 0)} /> : location === "/checklist" ? panelTwo : location === "/shower" ? panelThree : location === "/milestones" ? panelThree : location === "/budget" ? panelOne : <ProfilePanel />;
  const mobileWorkspace = <><header className="stage-toolbar"><div className="toolbar-left"><Brand /><span className="toolbar-divider" /><span className="toolbar-caption">gestão de enxoval</span></div><div className="toolbar-actions"><button type="button" onClick={() => go("/budget", 0)} className={`toolbar-link ${location === "/budget" ? "selected" : ""}`} data-testid="button-open-budget"><WalletCards size={14} /> orçamento</button><button type="button" onClick={() => go("/profile", 0)} className={`toolbar-link ${location === "/profile" ? "selected" : ""}`} data-testid="button-open-profile"><UserRound size={14} /> perfil</button><AccountControl /></div></header><div className="mobile-panel-switcher">{[["visão geral", 0, "/dashboard"], ["lista", 1, "/checklist"], ["linha do tempo", 2, "/milestones"]].map(([label, index, path]) => <button type="button" key={String(index)} onClick={() => go(String(path), Number(index))} className={activePanel === Number(index) ? "selected" : ""} data-testid={`button-mobile-panel-${index}`}>{label}</button>)}</div><main className="phone-stage"><Phone title="Ninho" activeRoute={location} setLocation={(path) => go(path, path === "/checklist" ? 1 : path === "/milestones" || path === "/shower" ? 2 : 0)} activePanel={activePanel} onPanel={setActivePanel}>{panelOne}</Phone><Phone title="Registro rápido" activeRoute={location} setLocation={(path) => go(path, path === "/checklist" ? 1 : path === "/milestones" || path === "/shower" ? 2 : 0)} activePanel={activePanel} onPanel={setActivePanel}>{panelTwo}</Phone><Phone title="Histórico" activeRoute={location} setLocation={(path) => go(path, path === "/checklist" ? 1 : path === "/milestones" || path === "/shower" ? 2 : 0)} activePanel={activePanel} onPanel={setActivePanel}>{panelThree}</Phone></main><div className="stage-note"><span><span className="note-dot" /> preparado para a chegada</span><span>sem pressa, sem excesso</span></div></>;
  return <div className="ninho-app">{desktopView ? <DesktopWorkspace location={location} go={go} items={items} content={desktopContent} /> : mobileWorkspace}{addOpen && <AddItemModal category="Roupas" onClose={() => setAddOpen(false)} onAdd={addItem} />}</div>;
}

function SignInPage() {
  return <main className="auth-page"><div className="auth-panel"><img className="auth-hero-image" src={loginHeroImage} alt="" /><Brand /><div className="auth-copy"><span className="desktop-eyebrow">GESTÃO DE ENXOVAL, SEM EXCESSO</span><h1 className="auth-tagline">Preparar a chegada<br />também pode ser <strong>leve.</strong></h1><p>Entre para continuar preparando cada detalhe com calma.</p></div></div><div className="auth-mobile-visual"><img src={loginHeroImage} alt="" /><div className="auth-mobile-overlay" /><Brand /><p className="auth-mobile-tagline">Preparar a chegada<br />também pode ser <strong>leve.</strong></p></div><div className="auth-clerk"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div></main>;
}

function SignUpPage() {
  return <main className="auth-page"><div className="auth-panel"><img className="auth-hero-image" src={loginHeroImage} alt="" /><Brand /><div className="auth-copy"><span className="desktop-eyebrow">COMECE QUANDO QUISER</span><h1>Um ninho<br />feito por vocês.</h1><p>Crie sua conta e reúna tudo o que importa para a chegada.</p></div></div><div className="auth-mobile-visual"><img src={loginHeroImage} alt="" /><div className="auth-mobile-overlay" /><Brand /></div><div className="auth-clerk"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div></main>;
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/dashboard" /></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>;
}

function ProtectedRoutes() {
  return <><Show when="signed-in"><Switch><Route path="/dashboard" component={Workspace} /><Route path="/checklist" component={Workspace} /><Route path="/milestones" component={Workspace} /><Route path="/shower" component={Workspace} /><Route path="/budget" component={Workspace} /><Route path="/profile" component={Workspace} /><Route component={NotFound} /></Switch></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}

function AppRouter() {
  return <ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route component={ProtectedRoutes} /></Switch></ErrorBoundary>;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={clerkLocalization} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}><QueryClientProvider client={queryClient}><TooltipProvider><AppRouter /><Toaster /></TooltipProvider></QueryClientProvider></ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error("Não foi possível carregar a autenticação.");
  return <WouterRouter base={basePath}><ClerkApp /></WouterRouter>;
}

export default App;