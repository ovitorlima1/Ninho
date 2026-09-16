import { type ReactNode } from "react";
import { Brand } from "@/components/brand";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      {/* Sem foto: a imagem antiga era a captura de um projeto de terceiros,
          com a marca e os botões de outro produto. */}
      <div className="auth-mobile-visual">
        <Brand />
        <p className="auth-mobile-tagline">Prepare a chegada <strong>com leveza.</strong></p>
      </div>
      <div className="auth-panel">
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
