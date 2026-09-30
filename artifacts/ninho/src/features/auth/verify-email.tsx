import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Mail, RotateCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { resendVerification, verifyEmail, type AuthSession } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/errors";
import { AuthLayout } from "@/features/auth/auth-layout";

/** Botão de reenviar o link. A resposta da API é sempre a mesma, exista ou não o cadastro. */
export function ResendVerificationButton({ email, testId = "button-resend-verification" }: { email: string; testId?: string }) {
  const mutation = useMutation({ mutationFn: () => resendVerification({ email: email.trim() }) });
  return (
    <div className="auth-resend">
      <button
        type="button"
        className="secondary-button auth-submit"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        data-testid={testId}
      >
        <RotateCw size={14} aria-hidden /> {mutation.isPending ? "Enviando…" : "Reenviar link de confirmação"}
      </button>
      {mutation.isSuccess && <p className="auth-notice" role="status">{mutation.data.message}</p>}
      {mutation.isError && <p className="auth-error" role="alert">{getAuthErrorMessage(mutation.error)}</p>}
    </div>
  );
}

/** Depois do cadastro: o link foi para o e-mail, e é ele que abre o ninho. */
export function CheckEmailCard({ email }: { email: string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="auth-card auth-result-card">
      <Mail size={22} className="auth-result-icon" aria-hidden />
      <div className="auth-card-header">
        <span className="eyebrow">Confira seu e-mail</span>
        <h2>Enviamos um link para <span className="auth-email">{email}</span></h2>
        <p>Abra o link para entrar no seu ninho. Ele vale por 24 horas. Se a mensagem não aparecer, confira o spam.</p>
      </div>
      <ResendVerificationButton email={email} />
      <p className="auth-switch">
        <button type="button" onClick={() => setLocation("/sign-in")} data-testid="button-check-email-sign-in">
          <ArrowLeft size={12} aria-hidden /> voltar para entrar
        </button>
      </p>
    </div>
  );
}

/** /verify-email?token=… — confirma, abre a sessão e segue para o onboarding. */
export function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const started = useRef(false);
  const resend = useMutation({ mutationFn: () => resendVerification({ email: email.trim() }) });
  const mutation = useMutation({
    mutationFn: () => verifyEmail({ token }),
    meta: { authFlow: true },
    onSuccess: (session) => {
      qc.clear();
      qc.setQueryData<AuthSession>(["auth-session"], session);
      setLocation("/dashboard");
    },
  });

  useEffect(() => {
    // O token fica só na memória: sai da barra de endereço e do histórico.
    if (window.location.search) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    // Uma chamada só, mesmo com o efeito rodando duas vezes em desenvolvimento.
    if (token && !started.current) {
      started.current = true;
      mutation.mutate();
    }
  }, [token, mutation]);

  const askAgain = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Digite um e-mail válido.");
      return;
    }
    setEmailError(null);
    resend.mutate();
  };

  if (token && (mutation.isPending || mutation.isSuccess || mutation.isIdle)) {
    return (
      <AuthLayout>
        <div className="auth-card auth-result-card" role="status">
          <div className="loading-spinner" aria-hidden />
          <div className="auth-card-header">
            <span className="eyebrow">Só um instante</span>
            <h2>Confirmando seu e-mail…</h2>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={askAgain} noValidate>
        <div className="auth-card-header">
          <span className="eyebrow">Confirmação de e-mail</span>
          <h2>Este link não vale mais</h2>
          <p role="alert">{token ? getAuthErrorMessage(mutation.error) : "Este link de confirmação é inválido ou expirou."} Peça outro abaixo.</p>
        </div>
        <div className="auth-fields">
          <label className="auth-field">
            E-mail do cadastro
            <input
              type="email"
              autoComplete="email"
              value={email}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "verify-email-error" : undefined}
              onChange={(event) => { setEmail(event.target.value); setEmailError(null); }}
              placeholder="voce@email.com"
              data-testid="input-verify-email"
            />
            {emailError && <span className="field-error" role="alert" id="verify-email-error">{emailError}</span>}
          </label>
        </div>
        {resend.isSuccess && <p className="auth-notice" role="status">{resend.data.message}</p>}
        {resend.isError && <p className="auth-error" role="alert">{getAuthErrorMessage(resend.error)}</p>}
        <button type="submit" className="primary-button auth-submit" disabled={resend.isPending} data-testid="button-verify-resend">
          {resend.isPending ? "Enviando…" : "Enviar novo link"}
        </button>
        <p className="auth-switch">
          <button type="button" onClick={() => setLocation("/sign-in")} data-testid="button-verify-sign-in">
            <ArrowLeft size={12} aria-hidden /> voltar para entrar
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
