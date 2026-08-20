import { useState } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  ArrowUpRight,
  Baby,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Copy,
  Gift,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  Milestone,
  Pencil,
  Plus,
  Ruler,
  Share2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

type CategoryKey = 'Roupas' | 'Higiene' | 'Alimentação' | 'Acessórios';
type ItemStatus = 'A comprar' | 'Comprado' | 'Ganhei';
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

const categoryMeta: Record<CategoryKey, { color: string; tint: string; description: string }> = {
  Roupas: { color: '#aa68e5', tint: '#eee2fa', description: 'Conforto para cada fase' },
  Higiene: { color: '#8b72d9', tint: '#e8e3f8', description: 'Pequenos rituais de cuidado' },
  Alimentação: { color: '#c06bc9', tint: '#f3e1f5', description: 'Para os primeiros encontros' },
  Acessórios: { color: '#9b86d0', tint: '#e9e5f5', description: 'O que deixa tudo mais simples' },
};

const initialItems: ChecklistItem[] = [
  { id: 1, name: 'Body manga curta', category: 'Roupas', group: 'RN · essenciais', qty: 6, owned: 4, status: 'Comprado', price: 38, essential: true },
  { id: 2, name: 'Macacão de algodão', category: 'Roupas', group: '0–3 meses', qty: 5, owned: 2, status: 'A comprar', price: 74, essential: true },
  { id: 3, name: 'Cueiro leve', category: 'Roupas', group: 'Primeiros dias', qty: 3, owned: 1, status: 'Ganhei', price: 42 },
  { id: 4, name: 'Toalha com capuz', category: 'Higiene', group: 'Banho', qty: 2, owned: 1, status: 'Comprado', price: 58, essential: true },
  { id: 5, name: 'Fralda de pano', category: 'Higiene', group: 'Troca', qty: 8, owned: 3, status: 'A comprar', price: 12, essential: true },
  { id: 6, name: 'Kit primeiros cuidados', category: 'Higiene', group: 'Farmacinha', qty: 1, owned: 0, status: 'A comprar', price: 96 },
  { id: 7, name: 'Mamadeira anticólica', category: 'Alimentação', group: 'Apoio', qty: 2, owned: 0, status: 'A comprar', price: 64 },
  { id: 8, name: 'Babador de tecido', category: 'Alimentação', group: 'Dia a dia', qty: 5, owned: 2, status: 'Comprado', price: 16 },
  { id: 9, name: 'Trocador portátil', category: 'Acessórios', group: 'Passeio', qty: 1, owned: 0, status: 'A comprar', price: 88 },
  { id: 10, name: 'Bolsa da maternidade', category: 'Acessórios', group: 'Maternidade', qty: 1, owned: 1, status: 'Ganhei', price: 310, essential: true },
];

const navItems = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/checklist', label: 'Meu checklist', icon: ListChecks },
  { href: '/milestones', label: 'Marcos', icon: Milestone },
  { href: '/shower', label: 'Chá de bebê', icon: Gift },
  { href: '/budget', label: 'Orçamento', icon: WalletCards },
  { href: '/profile', label: 'Meu perfil', icon: UserRound },
];

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-ninho">
      <div className={`relative flex h-10 w-10 items-center justify-center rounded-[14px] ${light ? 'bg-[#e4c987] text-[#5a2937]' : 'bg-[#713643] text-[#f7f0e3]'}`}>
        <Ruler className="h-5 w-5 -rotate-45" strokeWidth={1.7} />
        <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${light ? 'bg-[#7f9e82]' : 'bg-[#b6c9a5]'}`} />
      </div>
      <div>
        <div className={`font-display text-[25px] leading-none tracking-[-0.04em] ${light ? 'text-[#f8f0e4]' : 'text-[#5e2b39]'}`}>ninho</div>
        <div className={`mt-1 text-[9px] font-bold uppercase tracking-[0.22em] ${light ? 'text-[#dec9c3]' : 'text-[#9a756e]'}`}>enxoval com calma</div>
      </div>
    </div>
  );
}

function ProgressTape({ value, color = '#aa68e5', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-[#e5ded0] ${className}`} aria-label={`${value}% concluído`}>
      <div className="relative h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${value}%`, backgroundColor: color === '#7a9b7d' ? '#aa68e5' : color }}>
        <div className="absolute inset-y-0 right-1 w-px bg-white/60" />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = location === '/' ? '/' : `/${location.split('/')[1]}`;
  return (
    <div className="paper-grain ninho-canvas min-h-[100dvh] bg-[#f3eee4] text-[#4f3036]">
      <aside className="hidden">
        <div>
          <Logo light />
          <div className="mb-7 mt-14 text-[10px] font-bold uppercase tracking-[0.25em] text-[#cdb9b2]">Acompanhe seu preparo</div>
          <nav className="space-y-1.5" aria-label="Navegação principal">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = current === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-[14px] transition-all duration-300 ${active ? 'bg-[#8b5060] font-bold text-[#fff9f0] shadow-[inset_3px_0_0_#e4c987]' : 'text-[#dec9c3] hover:bg-[#7f4656] hover:text-[#fff9f0]'}`}
                >
                  <Icon className={`h-[18px] w-[18px] transition-transform group-hover:scale-105 ${active ? 'text-[#e4c987]' : ''}`} strokeWidth={active ? 2.2 : 1.7} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.07] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d5c1b8]">Seu ritmo</span>
            <TrendingUp className="h-4 w-4 text-[#e4c987]" />
          </div>
          <div className="font-display text-[24px]">3 semanas</div>
          <p className="mt-1 text-xs leading-relaxed text-[#d5c1b8]">mantendo o enxoval em movimento</p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-[#4f3036]/35 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[84%] max-w-[300px] bg-[#713643] px-7 py-8 text-[#f8f0e4] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <Logo light />
              <button onClick={() => setMobileOpen(false)} className="rounded-full p-2 text-[#dec9c3] hover:bg-white/10" data-testid="button-close-mobile-menu" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-5 mt-14 text-[10px] font-bold uppercase tracking-[0.25em] text-[#cdb9b2]">Acompanhe seu preparo</div>
            <nav className="space-y-1.5">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`mobile-link-${label.toLowerCase().replaceAll(' ', '-')}`} className={`flex items-center gap-3 rounded-2xl px-3 py-3.5 text-[14px] ${current === href ? 'bg-[#8b5060] font-bold text-[#fff9f0]' : 'text-[#dec9c3]'}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />{label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <main className="ninho-phone relative mx-auto min-h-[100dvh] max-w-[760px] overflow-hidden bg-[#f3eee4]/55 shadow-[0_20px_70px_rgba(76,54,107,.08)]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#ded6c8]/70 bg-[#f3eee4]/75 px-4 backdrop-blur-xl sm:px-7">
          <button className="rounded-xl p-2 text-[#713643] hover:bg-[#e8e0d4] lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-mobile-menu" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <div className="ml-1 lg:hidden"><Logo /></div>
           <div className="hidden text-[12px] font-medium text-[#8e746f] sm:block"><span className="text-[#b6a49a]">Ninho</span><span className="mx-2 text-[#c2aa9d]">/</span>{navItems.find((item) => item.href === current)?.label || 'Visão geral'}</div>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button onClick={() => setLocation('/milestones')} className="relative rounded-xl p-2 text-[#856c67] transition-colors hover:bg-[#e8e0d4] hover:text-[#713643]" data-testid="button-notifications" aria-label="Notificações"><Bell className="h-[18px] w-[18px]" strokeWidth={1.7} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#b26d78]" /></button>
            <div className="hidden h-6 w-px bg-[#ded6c8] sm:block" />
            <button onClick={() => setLocation('/profile')} className="flex items-center gap-2 text-left" data-testid="button-header-profile">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b6c9a5] font-display text-[15px] text-[#3d5942]">ML</div>
              <div className="hidden sm:block"><div className="text-[13px] font-bold text-[#5e3b41]">Marina Lima</div><div className="text-[10px] uppercase tracking-[0.12em] text-[#9b827b]">semana 24</div></div>
            </button>
          </div>
        </header>
         <div className="mx-auto max-w-[720px] px-4 pb-32 pt-6 sm:px-7 sm:pt-8">{children}</div>
      </main>
       <nav className="ninho-bottom-nav fixed bottom-4 left-1/2 z-40 grid h-[67px] w-[calc(100%-24px)] max-w-[480px] -translate-x-1/2 grid-cols-5 rounded-[25px] border border-white/80 bg-[#f8f3ea]/85 px-2 pb-1 shadow-[0_16px_42px_rgba(64,44,96,.18)] backdrop-blur-xl" aria-label="Navegação principal">
        {[navItems[0], navItems[1], navItems[3], navItems[4], navItems[5]].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} data-testid={`bottom-link-${label.toLowerCase().replaceAll(' ', '-')}`} className={`flex flex-col items-center justify-center gap-1 text-[9px] font-bold tracking-[0.03em] ${current === href ? 'text-[#713643]' : 'text-[#9d8a80]'}`}>
            <Icon className="h-[19px] w-[19px]" strokeWidth={current === href ? 2.2 : 1.7} /><span>{label === 'Visão geral' ? 'Início' : label === 'Meu checklist' ? 'Lista' : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#9b8179]">{eyebrow}</div><h1 className="font-display text-[32px] leading-[1.03] tracking-[-0.035em] text-[#5e2b39] sm:text-[39px]">{title}</h1>{description && <p className="mt-2 max-w-[540px] text-[14px] leading-relaxed text-[#876f68]">{description}</p>}</div>
      {action}
    </div>
  );
}

function Dashboard({ items, setLocation }: { items: ChecklistItem[]; setLocation: (to: string) => void }) {
  const bought = items.filter((item) => item.status !== 'A comprar').length;
  const score = Math.round((bought / items.length) * 100);
  const categoryProgress = (category: CategoryKey) => {
    const group = items.filter((item) => item.category === category);
    return Math.round((group.filter((item) => item.status !== 'A comprar').length / group.length) * 100);
  };
  return (
    <div className="page-enter">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="mb-3 text-[10px] font-bold uppercase tracking-[0.26em] text-[#9b8179]">terça-feira, 12 de março</div><h1 className="font-display text-[38px] leading-none tracking-[-0.045em] text-[#5e2b39] sm:text-[48px]">Bom dia, Marina.</h1><p className="mt-3 text-[15px] text-[#806a63]">Um passo de cada vez. Você está construindo um lugar inteiro.</p></div>
        <button onClick={() => setLocation('/checklist')} className="group flex w-fit items-center gap-2 rounded-full bg-[#713643] px-4 py-2.5 text-[12px] font-bold text-[#fff8ed] shadow-[0_8px_20px_rgba(113,54,67,.16)] transition-all hover:-translate-y-0.5 hover:bg-[#5e2b39]" data-testid="button-open-checklist"><Plus className="h-4 w-4" /> adicionar ao enxoval <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="relative overflow-hidden rounded-[28px] bg-[#713643] p-6 text-[#f9f0e2] shadow-[0_18px_42px_rgba(113,54,67,.16)] sm:p-8">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-[#c98d8e]/20" /><div className="absolute -right-2 -top-10 h-44 w-44 rounded-full border border-[#c98d8e]/20" />
          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
            <div><div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b8ae]"><Sparkles className="h-3.5 w-3.5 text-[#e4c987]" /> seu nível de preparo</div><div className="flex items-baseline gap-2"><span className="font-display text-[75px] leading-none tracking-[-0.07em] text-[#fff5e7]">{score}</span><span className="font-mono-app text-[13px] text-[#d7bab0]">/ 100</span></div><p className="mt-3 max-w-[270px] text-[14px] leading-relaxed text-[#e3cbc2]">Você está mais perto do que imagina. O essencial já está tomando forma.</p></div>
            <div className="relative flex h-[148px] w-[148px] shrink-0 items-center justify-center self-center sm:mr-5"><div className="absolute inset-0 rounded-full border-[9px] border-[#8c5360]" /><div className="absolute inset-0 rounded-full border-[9px] border-transparent border-l-[#e4c987] border-t-[#e4c987] border-r-[#e4c987] transition-transform duration-700" style={{ transform: `rotate(${score * 3.6 - 45}deg)` }} /><div className="text-center"><div className="font-mono-app text-[10px] uppercase tracking-widest text-[#d8b8ae]">feito</div><div className="mt-1 font-display text-[27px] text-[#fff5e7]">{bought} de {items.length}</div><div className="text-[10px] text-[#d8b8ae]">itens essenciais</div></div></div>
          </div>
          <div className="relative mt-7 border-t border-white/10 pt-4 text-[12px] text-[#d8b8ae]"><span className="font-bold text-[#e4c987]">+ 6%</span> desde a última semana <span className="mx-2 text-white/20">·</span> seu ritmo está bonito de ver</div>
        </section>
        <section className="relative overflow-hidden rounded-[28px] bg-[#dbe5d4] p-6 sm:p-8">
          <div className="absolute -bottom-10 -right-8 h-40 w-40 rounded-full bg-[#c2d2b9]/70" /><div className="relative"><div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5c765d]"><CalendarDays className="h-4 w-4" /> contagem carinhosa</div><span className="rounded-full bg-[#f3eee4]/70 px-2.5 py-1 font-mono-app text-[10px] text-[#70866f]">22 NOV 2025</span></div><div className="flex items-end gap-3"><span className="font-display text-[64px] leading-none tracking-[-0.06em] text-[#3f5e45]">128</span><span className="mb-2 text-[13px] font-bold text-[#6b806b]">dias<br />pela frente</span></div><p className="mt-5 max-w-[280px] text-[14px] leading-relaxed text-[#58705a]">A cada escolha, a casa fica um pouco mais pronta para receber vocês.</p><div className="mt-7 flex items-center justify-between border-t border-[#b6c9a5] pt-3 text-[11px] text-[#6b806b]"><span>semana 24 de 40</span><span className="font-bold text-[#4c694f]">60%</span></div><ProgressTape value={60} color="#7a9b7d" className="mt-2 bg-[#c5d5bc]" /></div>
        </section>
      </div>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-[26px] border border-[#e0d7c8] bg-[#f8f3ea] p-6 sm:p-7">
          <div className="mb-6 flex items-start justify-between"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9b8179]"><Ruler className="h-3.5 w-3.5 text-[#b26d78]" /> foco da semana</div><h2 className="font-display text-[26px] leading-tight text-[#633441]">Feche a lista de roupas RN</h2><p className="mt-2 max-w-[460px] text-[13px] leading-relaxed text-[#856e67]">Você já começou bem. Faltam só algumas peças para deixar os primeiros dias mais leves.</p></div><div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#f1dfe2] text-[#a95e6b] sm:flex"><ShoppingBag className="h-5 w-5" /></div></div>
          <div className="flex flex-col gap-3 border-t border-[#e4dbce] pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-[12px] text-[#806a63]"><CircleCheck className="h-4 w-4 text-[#7a9b7d]" /> 4 de 6 itens essenciais resolvidos</div><button onClick={() => setLocation('/checklist')} className="flex items-center gap-1.5 text-[12px] font-bold text-[#713643] hover:gap-2.5" data-testid="button-focus-week">ver roupas RN <ChevronRight className="h-3.5 w-3.5" /></button></div>
        </div>
        <div className="rounded-[26px] border border-[#e0d7c8] bg-[#f8f3ea] p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9b8179]">seu ritmo</div><h2 className="font-display text-[26px] text-[#633441]">3 semanas</h2></div><div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dcc8ad] text-[#ad8050]"><TrendingUp className="h-5 w-5" /></div></div><p className="text-[13px] leading-relaxed text-[#856e67]">Você voltou para cuidar do enxoval nas últimas três semanas. Sem pressa, sem cobrança.</p><div className="mt-5 flex items-center gap-1.5">{[1, 2, 3, 4, 5].map((day) => <div key={day} className={`h-1.5 flex-1 rounded-full ${day < 4 ? 'bg-[#ad8050]' : 'bg-[#e7dfd2]'}`} />)}</div><div className="mt-2 text-right text-[10px] text-[#9b8179]">próximo marco em 2 semanas</div></div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9b8179]">visão do enxoval</div><h2 className="font-display text-[29px] text-[#633441]">Como está cada canto</h2></div><Link href="/checklist" className="hidden items-center gap-1 text-[12px] font-bold text-[#713643] sm:flex" data-testid="link-see-all-categories">abrir lista completa <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(categoryMeta) as CategoryKey[]).map((category) => { const meta = categoryMeta[category]; const progress = categoryProgress(category); return <button key={category} onClick={() => setLocation('/checklist')} className="group rounded-[22px] border border-[#e0d7c8] bg-[#f8f3ea] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#c9b2a0] hover:shadow-[0_12px_24px_rgba(86,44,51,.07)]" data-testid={`card-category-${category.toLowerCase()}`}><div className="mb-6 flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: meta.tint, color: meta.color }}><Ruler className="h-4 w-4" /></div><span className="font-mono-app text-[11px] text-[#806a63]">{progress}%</span></div><div className="mb-1 font-display text-[21px] text-[#633441]">{category}</div><p className="mb-4 text-[11px] text-[#937d75]">{meta.description}</p><ProgressTape value={progress} color={meta.color} /><div className="mt-3 flex items-center justify-between text-[10px] text-[#9b8179]"><span>{items.filter((i) => i.category === category && i.status !== 'A comprar').length} resolvidos</span><ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></div></button>; })}
        </div>
      </section>

      <section className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[26px] bg-[#e9e0d2] p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9b8179]">próximo na linha do tempo</div><h2 className="font-display text-[26px] text-[#633441]">Mala da maternidade</h2></div><span className="rounded-full bg-[#f3eee4]/70 px-2.5 py-1 font-mono-app text-[10px] text-[#977463]">semana 36</span></div><div className="flex gap-4"><div className="flex flex-col items-center"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bfa88c] text-[#9c7758]"><Clock3 className="h-4 w-4" /></div><div className="mt-2 h-10 w-px border-l border-dashed border-[#bfa88c]" /></div><div><p className="text-[13px] leading-relaxed text-[#765f57]">Ainda faltam 12 semanas. Quando chegar a hora, você vai agradecer por ter deixado isso encaminhado.</p><button onClick={() => setLocation('/milestones')} className="mt-4 flex items-center gap-1 text-[12px] font-bold text-[#713643]" data-testid="button-open-milestones">ver todos os marcos <ChevronRight className="h-3.5 w-3.5" /></button></div></div></div>
        <div className="rounded-[26px] border border-[#e0d7c8] bg-[#f8f3ea] p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#9b8179]">chá de bebê</div><h2 className="font-display text-[26px] text-[#633441]">Dividir também é cuidar</h2></div><HeartHandshake className="h-5 w-5 text-[#b26d78]" /></div><p className="max-w-[430px] text-[13px] leading-relaxed text-[#856e67]">Crie uma lista compartilhável e deixe quem ama vocês escolher como participar.</p><Link href="/shower" className="mt-5 flex w-fit items-center gap-2 rounded-full border border-[#cbaeb0] px-4 py-2 text-[12px] font-bold text-[#713643] transition-colors hover:bg-[#f1dfe2]" data-testid="link-create-shower">organizar meu chá <Share2 className="h-3.5 w-3.5" /></Link></div>
      </section>
    </div>
  );
}

function Checklist({ items, setItems }: { items: ChecklistItem[]; setItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>> }) {
  const [category, setCategory] = useState<CategoryKey>('Roupas');
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [search, setSearch] = useState('');
  const visible = items.filter((item) => item.category === category && item.name.toLowerCase().includes(search.toLowerCase()));
  const cycleStatus = (id: number) => setItems((current) => current.map((item) => {
    if (item.id !== id) return item;
    const nextStatus: ItemStatus = item.status === 'A comprar' ? 'Comprado' : item.status === 'Comprado' ? 'Ganhei' : 'A comprar';
    return { ...item, status: nextStatus, owned: nextStatus === 'A comprar' ? 0 : item.qty };
  }));
  const addItem = () => { if (!newItem.trim()) return; setItems((current) => [...current, { id: Date.now(), name: newItem.trim(), category, group: 'Adicionado por você', qty: 1, owned: 0, status: 'A comprar', price: 0 }]); setNewItem(''); setModalOpen(false); };
  return (
    <div className="page-enter">
      <SectionHeading eyebrow="a parte prática" title="Meu checklist" description="Uma lista feita para sair da cabeça e entrar na casa — no seu ritmo." action={<button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-full bg-[#713643] px-4 py-2.5 text-[12px] font-bold text-[#fff8ed] shadow-[0_8px_18px_rgba(113,54,67,.14)]" data-testid="button-add-item"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">adicionar item</span><span className="sm:hidden">adicionar</span></button>} />
       <div className="segmented-filters mb-7 flex gap-2 overflow-x-auto pb-1">{(Object.keys(categoryMeta) as CategoryKey[]).map((key) => <button key={key} onClick={() => setCategory(key)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[12px] font-bold transition-all ${category === key ? 'bg-[#713643] text-[#fff8ed]' : 'border border-[#ddd2c4] bg-[#f8f3ea] text-[#876f68] hover:border-[#b99a8e]'}`} data-testid={`button-category-${key.toLowerCase()}`}>{key}<span className={`ml-2 font-mono-app text-[10px] ${category === key ? 'text-[#e4c987]' : 'text-[#ac958c]'}`}>{items.filter((i) => i.category === key && i.status !== 'A comprar').length}/{items.filter((i) => i.category === key).length}</span></button>)}</div>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="font-display text-[27px] text-[#633441]">{category}</div><div className="mt-1 text-[12px] text-[#927b73]">{categoryMeta[category].description}</div></div><div className="relative w-full sm:w-[220px]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="buscar na lista" className="w-full rounded-full border border-[#ddd2c4] bg-[#f8f3ea] px-4 py-2.5 text-[12px] text-[#633441] outline-none transition-colors placeholder:text-[#ad9990] focus:border-[#9b6972]" data-testid="input-search-checklist" /></div></div>
      <div className="overflow-hidden rounded-[24px] border border-[#e0d7c8] bg-[#f8f3ea]">
        <div className="hidden grid-cols-[1fr_100px_115px_110px] border-b border-[#e5ddd0] bg-[#f2eadf] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b8179] sm:grid"><span>item</span><span>quantidade</span><span>progresso</span><span>situação</span></div>
        {visible.length === 0 ? <div className="px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e9e0d2] text-[#a88372]"><ListChecks className="h-5 w-5" /></div><h3 className="mt-4 font-display text-[23px] text-[#633441]">Essa parte ainda está em branco</h3><p className="mx-auto mt-2 max-w-[310px] text-[13px] leading-relaxed text-[#927b73]">Comece adicionando o que já sabe que vai precisar. O resto pode esperar.</p><button onClick={() => setModalOpen(true)} className="mt-5 text-[12px] font-bold text-[#713643] underline underline-offset-4" data-testid="button-empty-add-item">adicionar primeiro item</button></div> : visible.map((item) => { const meta = categoryMeta[item.category]; const progress = Math.min(100, Math.round((item.owned / item.qty) * 100)); return <div key={item.id} className="grid gap-3 border-b border-[#e8e0d4] px-5 py-5 last:border-0 sm:grid-cols-[1fr_100px_115px_110px] sm:items-center" data-testid={`row-checklist-${item.id}`}><div className="flex items-start gap-3"><button onClick={() => cycleStatus(item.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${item.status === 'Comprado' ? 'border-[#7a9b7d] bg-[#7a9b7d] text-white' : item.status === 'Ganhei' ? 'border-[#b26d78] bg-[#b26d78] text-white' : 'border-[#c6b8ab] text-transparent hover:border-[#7a9b7d]'}`} data-testid={`button-toggle-item-${item.id}`} aria-label={`Alterar status de ${item.name}`}>{item.status !== 'A comprar' && <Check className="h-3 w-3" strokeWidth={3} />}</button><div><div className={`text-[14px] font-bold ${item.status !== 'A comprar' ? 'text-[#806d67]' : 'text-[#633441]'}`}>{item.name}</div><div className="mt-1 text-[11px] text-[#a0887e]">{item.group}{item.essential && <span className="ml-2 rounded-full bg-[#e9e0d2] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9b7566]">essencial</span>}</div></div></div><div className="ml-8 flex items-center gap-2 text-[12px] text-[#826d65] sm:ml-0"><span className="sm:hidden text-[10px] uppercase tracking-wider text-[#ae9b91]">meta</span><span className="font-mono-app">{item.qty} un.</span></div><div className="ml-8 sm:ml-0"><div className="mb-1.5 flex items-center justify-between text-[10px] text-[#9b8179]"><span>{item.owned}/{item.qty} resolvidos</span><span>{progress}%</span></div><ProgressTape value={progress} color={meta.color} /></div><button onClick={() => cycleStatus(item.id)} className={`ml-8 w-fit rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-colors sm:ml-0 ${item.status === 'Comprado' ? 'bg-[#e5eee2] text-[#57745a]' : item.status === 'Ganhei' ? 'bg-[#f1dfe2] text-[#9f5966]' : 'bg-[#eee6ce] text-[#987c48] hover:bg-[#e4d8b8]'}`} data-testid={`button-status-${item.id}`}>{item.status}</button></div>; })}</div>
      {modalOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#4f3036]/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onClick={() => setModalOpen(false)}><div className="w-full max-w-[430px] rounded-t-[28px] bg-[#f8f3ea] p-6 shadow-2xl sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}><div className="mb-6 flex items-start justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8179]">sua lista, suas regras</div><h2 className="font-display text-[28px] text-[#633441]">Adicionar um item</h2></div><button onClick={() => setModalOpen(false)} className="rounded-full p-2 text-[#876f68] hover:bg-[#ece3d7]" data-testid="button-close-add-item"><X className="h-5 w-5" /></button></div><label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#927b73]" htmlFor="new-item">nome do item</label><input id="new-item" autoFocus value={newItem} onChange={(event) => setNewItem(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addItem()} placeholder="ex.: manta para o carrinho" className="mt-2 w-full rounded-2xl border border-[#d9cbbd] bg-[#fffaf2] px-4 py-3.5 text-[14px] text-[#633441] outline-none focus:border-[#9b6972]" data-testid="input-new-item" /><div className="mt-5 rounded-2xl bg-[#e9e0d2] p-4 text-[12px] leading-relaxed text-[#806a63]">Este item entra em <strong className="text-[#633441]">{category}</strong>. Você pode ajustar a categoria depois.</div><button onClick={addItem} disabled={!newItem.trim()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#713643] py-3.5 text-[13px] font-bold text-[#fff8ed] transition-opacity disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-confirm-add-item"><Plus className="h-4 w-4" /> colocar na lista</button></div></div>}
    </div>
  );
}

function Milestones() {
  const [completed, setCompleted] = useState<number[]>([20]);
  const milestones = [{ week: '20', title: 'Defina o estilo do quarto', description: 'Uma referência de cores, tecidos e atmosfera já ajuda a escolher sem excesso.', state: 'concluído' }, { week: '28', title: 'Feche a lista de roupas RN', description: 'Revise tamanhos, tecidos e o que faz sentido para o clima de onde você mora.', state: 'agora' }, { week: '32', title: 'Organize o chá de bebê', description: 'Compartilhe a lista com quem está perto e transforme ajuda em presença.', state: 'próximo' }, { week: '36', title: 'Mala da maternidade pronta', description: 'Tudo separado para os primeiros dias, com tempo para respirar.', state: 'à frente' }];
  return <div className="page-enter"><SectionHeading eyebrow="sem pressa, na hora certa" title="Marcos da jornada" description="Pequenas chegadas ao longo do caminho. Nada aqui é cobrança — só um jeito de enxergar o que vem." /><div className="mb-7 flex items-center gap-3 rounded-[22px] border border-[#e0d7c8] bg-[#f8f3ea] p-4 sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e5eee2] text-[#648069]"><TrendingUp className="h-5 w-5" /></div><div className="flex-1"><div className="flex items-center justify-between text-[12px] font-bold text-[#633441]"><span>ritmo de preparo</span><span className="font-mono-app text-[10px] text-[#769173]">1 de 4</span></div><ProgressTape value={25} color="#7a9b7d" className="mt-2" /></div></div><div className="relative ml-4 max-w-[820px] border-l border-dashed border-[#cdbbaa] pl-7 sm:ml-8 sm:pl-10">{milestones.map((milestone, index) => { const done = completed.includes(Number(milestone.week)); return <div key={milestone.week} className="relative pb-9 last:pb-0"><div className={`absolute -left-[43px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-4 border-[#f3eee4] ${done ? 'bg-[#7a9b7d] text-white' : milestone.state === 'agora' ? 'bg-[#713643] text-[#e4c987] shadow-[0_0_0_5px_#eadde0]' : 'bg-[#e8dfd2] text-[#a78b7b]'}`}>{done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</div><div className="rounded-[24px] border border-[#e0d7c8] bg-[#f8f3ea] p-5 transition-all hover:shadow-[0_10px_28px_rgba(86,44,51,.06)] sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex items-center gap-2"><span className="font-mono-app text-[10px] text-[#a38372]">SEMANA {milestone.week}</span>{milestone.state === 'agora' && <span className="rounded-full bg-[#f1dfe2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9f5966]">seu momento</span>}{done && <span className="rounded-full bg-[#e5eee2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#57745a]">feito com calma</span>}</div><h2 className="font-display text-[25px] text-[#633441]">{milestone.title}</h2><p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-[#856e67]">{milestone.description}</p></div>{done ? <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d8c696] bg-[#eee6ce] text-[#aa8950]"><Sparkles className="h-5 w-5" /></div> : milestone.state === 'agora' ? <button onClick={() => setCompleted((current) => [...current, Number(milestone.week)])} className="flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-[#caaeb0] px-3 py-2 text-[11px] font-bold text-[#713643] transition-colors hover:bg-[#f1dfe2]" data-testid={`button-complete-milestone-${milestone.week}`}><CircleCheck className="h-3.5 w-3.5" /> marcar como feito</button> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eee6ce] text-[#aa8950]"><LockIcon /></div>}</div></div></div>; })}</div></div>;
}

function LockIcon() { return <span className="relative block h-3.5 w-3.5 rounded-[3px] border-2 border-current"><span className="absolute -top-2 left-0.5 h-2.5 w-2 border-2 border-b-0 border-current" /></span>; }

function Shower() {
  const [copied, setCopied] = useState(false);
  const [eventDate, setEventDate] = useState('2025-10-18');
  const [selected, setSelected] = useState<number[]>([2, 5, 9]);
  const giftItems = [{ id: 2, name: 'Macacão de algodão', qty: '2 un.', guest: 'Camila R.' }, { id: 5, name: 'Fralda de pano', qty: '8 un.', guest: 'Joana M.' }, { id: 9, name: 'Trocador portátil', qty: '1 un.', guest: '' }];
  const copyLink = () => { navigator.clipboard?.writeText('ninho.app/cha/marina-lima-24'); setCopied(true); setTimeout(() => setCopied(false), 2200); };
  return <div className="page-enter"><SectionHeading eyebrow="um jeito leve de pedir ajuda" title="Chá de bebê" description="Compartilhe escolhas, não uma lista de tarefas. Quem ama vocês escolhe como estar perto." action={<button onClick={copyLink} className="flex items-center gap-2 rounded-full border border-[#cbaeb0] bg-[#f8f3ea] px-4 py-2.5 text-[12px] font-bold text-[#713643]" data-testid="button-copy-share-link">{copied ? <Check className="h-4 w-4 text-[#668269]" /> : <Copy className="h-4 w-4" />}{copied ? 'link copiado' : 'copiar link'}</button>} /><div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><section className="overflow-hidden rounded-[28px] bg-[#713643] p-6 text-[#f8f0e4] sm:p-8"><div className="flex items-start justify-between"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b8ae]"><HeartHandshake className="h-4 w-4 text-[#e4c987]" /> seu evento</div><h2 className="font-display text-[32px] leading-tight text-[#fff6e8]">Um encontro para<br />chegar mais perto</h2></div><Gift className="h-7 w-7 text-[#e4c987]" strokeWidth={1.3} /></div><p className="mt-5 max-w-[400px] text-[14px] leading-relaxed text-[#dfc8bf]">A lista fica disponível para convidados, sem precisar criar conta. Os presentes confirmados já contam para o seu preparo.</p><label className="mt-7 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#d8b8ae]" htmlFor="event-date">data do encontro</label><div className="relative mt-2 max-w-[230px]"><CalendarDays className="absolute left-3 top-3 h-4 w-4 text-[#c09b93]" /><input id="event-date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 pl-10 text-[13px] text-[#fff6e8] outline-none [color-scheme:dark]" data-testid="input-event-date" /></div><div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-[12px] text-[#d8b8ae]"><Share2 className="h-4 w-4 text-[#e4c987]" /> ninho.app/cha/marina-lima-24 <button onClick={copyLink} className="ml-auto rounded-lg p-1.5 hover:bg-white/10" data-testid="button-copy-share-link-card" aria-label="Copiar link"><Copy className="h-3.5 w-3.5" /></button></div></section><section className="rounded-[28px] border border-[#e0d7c8] bg-[#f8f3ea] p-6 sm:p-8"><div className="mb-5 flex items-start justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8179]">presença confirmada</div><h2 className="font-display text-[27px] text-[#633441]">Quem está chegando</h2></div><span className="font-mono-app text-[12px] text-[#a38372]">2 presentes</span></div><div className="space-y-3">{giftItems.filter((item) => item.guest).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#e5eee2] px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b6c9a5] text-[10px] font-bold text-[#466049]">{item.guest.split(' ').map((word) => word[0]).join('')}</div><div className="flex-1"><div className="text-[13px] font-bold text-[#57705a]">{item.guest}</div><div className="text-[11px] text-[#789077]">{item.name} · {item.qty}</div></div><CheckCircle2 className="h-4 w-4 text-[#6c8b6d]" /></div>)}<div className="rounded-2xl border border-dashed border-[#d7cbbd] px-4 py-4 text-center text-[12px] text-[#a18b81]">O próximo nome pode ser alguém que você ama.</div></div></section></div><section className="mt-6 rounded-[26px] border border-[#e0d7c8] bg-[#f8f3ea] p-6 sm:p-7"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8179]">curadoria do presente</div><h2 className="font-display text-[27px] text-[#633441]">Itens disponíveis para presentear</h2></div><p className="text-[12px] text-[#927b73]">Você escolhe o que fica visível.</p></div><div className="grid gap-3 md:grid-cols-3">{giftItems.map((item) => <button key={item.id} onClick={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${selected.includes(item.id) ? 'border-[#b6c9a5] bg-[#eef4eb]' : 'border-[#e2d8cc] bg-[#f3eee4] opacity-60'}`} data-testid={`button-gift-item-${item.id}`}><div className={`flex h-7 w-7 items-center justify-center rounded-full border ${selected.includes(item.id) ? 'border-[#7a9b7d] bg-[#7a9b7d] text-white' : 'border-[#c8b9aa] text-transparent'}`}><Check className="h-3.5 w-3.5" /></div><div className="flex-1"><div className="text-[13px] font-bold text-[#633441]">{item.name}</div><div className="mt-1 text-[11px] text-[#988178]">{item.qty}</div></div><Gift className="h-4 w-4 text-[#b78c7e]" /></button>)}</div></section></div>;
}

function Budget({ items }: { items: ChecklistItem[] }) {
  const [planned, setPlanned] = useState<Record<CategoryKey, number>>({ Roupas: 1240, Higiene: 680, Alimentação: 520, Acessórios: 940 });
  const spent = (category: CategoryKey) => items.filter((item) => item.category === category && item.status !== 'A comprar').reduce((sum, item) => sum + item.price, 0);
  const totalPlanned = Object.values(planned).reduce((sum, value) => sum + value, 0);
  const totalSpent = (Object.keys(categoryMeta) as CategoryKey[]).reduce((sum, category) => sum + spent(category), 0);
  return <div className="page-enter"><SectionHeading eyebrow="clareza sem planilha" title="Orçamento" description="Ter uma visão do todo também é uma forma de cuidar. Ajuste os valores à realidade de vocês." action={<div className="rounded-full bg-[#e5eee2] px-3 py-2 font-mono-app text-[10px] text-[#57745a]">{Math.round((totalSpent / totalPlanned) * 100)}% do previsto</div>} /><div className="grid gap-5 md:grid-cols-3"><div className="rounded-[26px] bg-[#713643] p-6 text-[#f8f0e4]"><div className="mb-8 flex items-center justify-between text-[#d8b8ae]"><span className="text-[10px] font-bold uppercase tracking-[0.2em]">investido até aqui</span><WalletCards className="h-5 w-5 text-[#e4c987]" /></div><div className="font-display text-[38px] tracking-[-0.04em]">{money(totalSpent)}</div><div className="mt-2 text-[12px] text-[#d8b8ae]">em itens já resolvidos</div></div><div className="rounded-[26px] border border-[#e0d7c8] bg-[#f8f3ea] p-6"><div className="mb-8 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8179]">planejado</div><div className="font-display text-[38px] tracking-[-0.04em] text-[#633441]">{money(totalPlanned)}</div><div className="mt-2 text-[12px] text-[#927b73]">estimativa do enxoval</div></div><div className="rounded-[26px] bg-[#e9e0d2] p-6"><div className="mb-8 flex items-center justify-between text-[#9b8179]"><span className="text-[10px] font-bold uppercase tracking-[0.2em]">restante</span><TrendingUp className="h-5 w-5 text-[#ad8050]" /></div><div className="font-display text-[38px] tracking-[-0.04em] text-[#633441]">{money(totalPlanned - totalSpent)}</div><div className="mt-2 text-[12px] text-[#856e67]">para completar a previsão</div></div></div><section className="mt-6 rounded-[26px] border border-[#e0d7c8] bg-[#f8f3ea] p-6 sm:p-7"><div className="mb-6 flex items-end justify-between"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8179]">por categoria</div><h2 className="font-display text-[27px] text-[#633441]">Onde o valor está</h2></div><span className="text-[11px] text-[#a18b81]">valores editáveis</span></div><div className="space-y-5">{(Object.keys(categoryMeta) as CategoryKey[]).map((category) => { const meta = categoryMeta[category]; return <div key={category} className="grid gap-2 sm:grid-cols-[120px_1fr_120px] sm:items-center"><div className="flex items-center gap-2 text-[13px] font-bold text-[#633441]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />{category}</div><div><div className="mb-1.5 flex justify-between text-[10px] text-[#9b8179]"><span>gasto {money(spent(category))}</span><span>{Math.round((spent(category) / planned[category]) * 100)}%</span></div><ProgressTape value={Math.min(100, (spent(category) / planned[category]) * 100)} color={meta.color} /></div><div className="flex items-center gap-2 sm:justify-end"><span className="text-[10px] text-[#a18b81]">previsto</span><div className="relative"><span className="absolute left-2 top-2.5 text-[11px] text-[#a18b81]">R$</span><input value={planned[category]} onChange={(event) => setPlanned((current) => ({ ...current, [category]: Number(event.target.value) || 0 }))} type="number" className="w-[91px] rounded-xl border border-[#ddd2c4] bg-[#f3eee4] py-2 pl-7 pr-2 text-right font-mono-app text-[11px] text-[#633441] outline-none focus:border-[#b99a8e]" data-testid={`input-budget-${category.toLowerCase()}`} /></div></div></div>; })}</div><div className="mt-7 flex items-center gap-2 border-t border-[#e5ddd0] pt-4 text-[11px] text-[#927b73]"><Pencil className="h-3.5 w-3.5 text-[#ad8050]" /> Os valores são uma bússola, não uma regra.</div></section></div>;
}

function Profile() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('Marina Lima');
  const [city, setCity] = useState('São Paulo, SP');
  return <div className="page-enter"><SectionHeading eyebrow="seu espaço" title="Meu perfil" description="Os detalhes que ajudam o Ninho a acompanhar a chegada de vocês." action={<button onClick={() => setEditing((value) => !value)} className="flex items-center gap-2 rounded-full border border-[#cbaeb0] bg-[#f8f3ea] px-4 py-2.5 text-[12px] font-bold text-[#713643]" data-testid="button-edit-profile">{editing ? <Check className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}{editing ? 'salvar alterações' : 'editar perfil'}</button>} /><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-[28px] bg-[#713643] p-7 text-[#f8f0e4] sm:p-8"><div className="flex items-center gap-4"><div className="flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[#b6c9a5] font-display text-[27px] text-[#466049]">ML</div><div><div className="font-display text-[27px]">{name}</div><div className="mt-1 text-[12px] text-[#d8b8ae]">primeira gestação · semana 24</div></div></div><div className="mt-9 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"><div className="text-[10px] uppercase tracking-[0.15em] text-[#d8b8ae]">preparo</div><div className="mt-2 font-display text-[26px] text-[#e4c987]">68%</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"><div className="text-[10px] uppercase tracking-[0.15em] text-[#d8b8ae]">conquistas</div><div className="mt-2 font-display text-[26px] text-[#e4c987]">2</div></div></div><div className="mt-7 border-t border-white/10 pt-5"><div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-[#d8b8ae]">uma frase para agora</div><p className="font-display text-[21px] leading-tight text-[#fff5e7]">“O que é essencial pode ser simples.”</p></div></section><section className="rounded-[28px] border border-[#e0d7c8] bg-[#f8f3ea] p-6 sm:p-8"><div className="mb-6"><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b8179]">dados da gestação</div><h2 className="font-display text-[27px] text-[#633441]">Para personalizar seu caminho</h2></div><div className="grid gap-5 sm:grid-cols-2"><label className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#927b73]">seu nome<input value={name} onChange={(event) => setName(event.target.value)} disabled={!editing} className="mt-2 w-full rounded-xl border border-[#ddd2c4] bg-[#f3eee4] px-3 py-3 text-[14px] font-normal normal-case tracking-normal text-[#633441] outline-none disabled:opacity-70 focus:border-[#b99a8e]" data-testid="input-profile-name" /></label><label className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#927b73]">cidade<input value={city} onChange={(event) => setCity(event.target.value)} disabled={!editing} className="mt-2 w-full rounded-xl border border-[#ddd2c4] bg-[#f3eee4] px-3 py-3 text-[14px] font-normal normal-case tracking-normal text-[#633441] outline-none disabled:opacity-70 focus:border-[#b99a8e]" data-testid="input-profile-city" /></label><div><div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#927b73]">data prevista</div><div className="mt-2 flex items-center gap-2 rounded-xl border border-[#ddd2c4] bg-[#f3eee4] px-3 py-3 text-[14px] text-[#633441]"><CalendarDays className="h-4 w-4 text-[#a38372]" />22 de novembro de 2025</div></div><div><div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#927b73]">onde você está</div><div className="mt-2 flex items-center gap-2 rounded-xl border border-[#ddd2c4] bg-[#f3eee4] px-3 py-3 text-[14px] text-[#633441]"><MapPin className="h-4 w-4 text-[#a38372]" />{city}</div></div></div><div className="mt-7 border-t border-[#e5ddd0] pt-5"><div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#927b73]">conquistas guardadas</div><div className="mt-4 flex flex-wrap gap-3"><div className="flex items-center gap-2 rounded-full bg-[#eee6ce] px-3 py-2 text-[11px] font-bold text-[#987c48]"><Sparkles className="h-3.5 w-3.5" /> primeiro passo</div><div className="flex items-center gap-2 rounded-full bg-[#e5eee2] px-3 py-2 text-[11px] font-bold text-[#57745a]"><CheckCircle2 className="h-3.5 w-3.5" /> quarto imaginado</div><div className="flex items-center gap-2 rounded-full border border-dashed border-[#d7cbbd] px-3 py-2 text-[11px] text-[#a18b81]"><Circle className="h-3.5 w-3.5" /> próxima chegada</div></div></div></section></div><section className="mt-6 rounded-[24px] border border-[#e0d7c8] bg-[#f8f3ea] p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1dfe2] text-[#a95e6b]"><Baby className="h-5 w-5" /></div><div className="flex-1"><div className="text-[13px] font-bold text-[#633441]">Primeira gestação</div><div className="mt-1 text-[12px] text-[#927b73]">Planejando amamentar · bebê único</div></div><ChevronRight className="h-4 w-4 text-[#ad958c]" /></div></section></div>;
}

function Router() {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [location, setLocation] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/"><Dashboard items={items} setLocation={setLocation} /></Route>
    <Route path="/checklist"><Checklist items={items} setItems={setItems} /></Route>
    <Route path="/milestones"><Milestones /></Route>
    <Route path="/shower"><Shower /></Route>
    <Route path="/budget"><Budget items={items} /></Route>
    <Route path="/profile"><Profile /></Route>
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Shell><Router /></Shell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;