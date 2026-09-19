import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[--radius-clinician] border-2 border-line bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${className}`}>{children}</section>;
}

export function H2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-extrabold ${className}`}>{children}</h2>;
}

const VARIANTS = {
  primary: 'bg-brand text-ink hover:brightness-97',
  secondary: 'bg-lavender text-ink hover:brightness-97',
  ghost: 'text-brand-dark hover:bg-brand-soft',
  danger: 'bg-bad-soft text-bad hover:bg-bad-soft/70',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', icon, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[--radius-clinician] px-4 py-2 font-semibold transition disabled:opacity-50 ${VARIANTS[variant]} ${className}`}>
      {icon}
      {children}
    </button>
  );
}

export function Field({ label, hint, className = '', ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-bold text-ink-soft">{label}</span>
      <input
        {...rest}
        className="rounded-[--radius-clinician] border-2 border-line bg-white px-3 py-2 font-medium outline-none focus:border-brand"
      />
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export function Select({ label, children, className = '', ...rest }: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-bold text-ink-soft">{label}</span>
      <select {...rest} className="rounded-[--radius-clinician] border-2 border-line bg-white px-3 py-2 font-medium outline-none focus:border-brand">
        {children}
      </select>
    </label>
  );
}

const PILLS = {
  neutral: 'bg-line text-ink',
  brand: 'bg-brand-soft text-brand-dark',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
} as const;

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof PILLS }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${PILLS[tone]}`}>{children}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-[--radius-clinician] border-2 border-line bg-white px-4 py-3">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-bold text-ink-soft">{label}</div>
      {sub ? <div className="text-[11px] text-ink-soft">{sub}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[--radius-clinician] border-2 border-dashed border-line px-4 py-6 text-center text-ink-soft">{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="text-sm font-bold text-bad">{children}</p> : null;
}
