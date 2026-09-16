import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { requestPasswordReset, resetPassword } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/errors";
import { AuthLayout } from "@/features/auth/auth-layout";

export function PasswordResetRequestPage() {
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
            <span className="eyebrow">CONFIRA SEU E-MAIL</span>
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
          <span className="eyebrow">RECUPERE SEU ESPAÇO</span>
          <h2>Esqueceu sua senha?</h2>
          <p>Digite seu e-mail e, se houver uma conta, enviaremos um link temporário para você voltar ao seu ninho.</p>
        </div>
        <div className="auth-fields">
          <label className="auth-field">
            E-MAIL
            <input
              type="email"
              autoComplete="email"
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

export function PasswordResetPage() {
  const [, setLocation] = useLocation();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  // O token fica só na memória: sai da barra de endereço e do histórico, para
  // não ser copiado, sincronizado entre aparelhos nem enviado como Referer.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);
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
          <div className="auth-result-check" aria-hidden><Check size={22} /></div>
          <div className="auth-card-header">
            <span className="eyebrow">TUDO PRONTO</span>
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
          <span className="eyebrow">NOVA SENHA</span>
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
