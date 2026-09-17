import { type ReactNode } from "react";
import { Brand } from "@/components/brand";

// Foto: Breno Dias na Unsplash (Licença Unsplash) — ver .specs/features/lilas-e-foto-login.
const HERO_IMAGE = `${import.meta.env.BASE_URL}images/login-gestante.jpg`;

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-mobile-visual">
        <img className="auth-hero-image" src={HERO_IMAGE} alt="" decoding="async" />
        <Brand />
        <p className="auth-mobile-tagline">Prepare a chegada <strong>com leveza.</strong></p>
      </div>
      <div className="auth-panel">
        <img className="auth-hero-image" src={HERO_IMAGE} alt="" decoding="async" />
        <Brand />
        <div className="auth-copy">
          <span className="eyebrow">Organização de enxoval</span>
          <h1>Prepare a chegada<br /><strong>com leveza.</strong></h1>
          <p>Checklist, orçamento e marcos da gestação — tudo no seu ritmo.</p>
          <div className="auth-tape" aria-hidden><span /></div>
        </div>
      </div>
      <div className="auth-form-panel">{children}</div>
    </div>
  );
}
