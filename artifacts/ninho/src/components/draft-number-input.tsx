import { useState, type InputHTMLAttributes } from "react";

/**
 * Campo numérico que guarda o texto enquanto a pessoa digita e só normaliza ao
 * sair do campo. Reformatar a cada tecla transformava "45,90" em "4,02" e
 * impedia apagar a quantidade para digitar outra.
 */
export function DraftNumberInput({
  value, onChange, parse, format, ...rest
}: {
  value: number;
  onChange: (value: number) => void;
  parse: (text: string) => number | null;
  format: (value: number) => string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(() => format(value));
  const [lastValue, setLastValue] = useState(value);
  // Mudança vinda de fora (ex.: valores salvos recarregados): mostra o novo valor.
  if (value !== lastValue) {
    setLastValue(value);
    if (parse(text) !== value) setText(format(value));
  }
  const invalid = text.trim() !== "" && parse(text) === null;
  return (
    <input
      {...rest}
      value={text}
      aria-invalid={invalid || rest["aria-invalid"] ? true : undefined}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = parse(event.target.value);
        if (parsed !== null) {
          setLastValue(parsed);
          onChange(parsed);
        }
      }}
      onBlur={(event) => {
        setText(format(parse(text) ?? value));
        rest.onBlur?.(event);
      }}
    />
  );
}

export function parseQtyInput(text: string): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) return null;
  const qty = Number(text.trim());
  return qty >= 1 && qty <= 999 ? qty : null;
}
