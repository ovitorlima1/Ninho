import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PasswordField } from "@/components/password-field";
import { login, register, type AuthSession } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { AuthLayout } from "@/features/auth/auth-layout";

export type AuthMode = "signin" | "signup";

export type AuthFieldErrors = { email?: string; password?: string; confirmation?: string };

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPage({ mode }: { mode: AuthMode }) {
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
    meta: { authFlow: true },
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
            <span className="eyebrow">{isSignup ? "SEU ESPAÇO" : "BEM-VINDA DE VOLTA"}</span>
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
