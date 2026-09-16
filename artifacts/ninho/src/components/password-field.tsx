import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  value,
  onChange,
  autoComplete,
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
