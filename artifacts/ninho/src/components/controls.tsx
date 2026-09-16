import { type ReactNode } from "react";

export function TinyButton({ children, onClick, label, testId }: { children: ReactNode; onClick: () => void; label?: string; testId: string }) {
  return <button type="button" className="icon-button" onClick={onClick} aria-label={label} data-testid={testId}>{children}</button>;
}

export function Pill({ active, children, onClick, testId }: { active?: boolean; children: ReactNode; onClick?: () => void; testId: string }) {
  return <button type="button" className={`pill ${active ? "pill-active" : ""}`} onClick={onClick} data-testid={testId}>{children}</button>;
}
