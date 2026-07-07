import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/* Крупные касабельные элементы: работа в перчатках на улице */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'

const btnStyles: Record<BtnVariant, string> = {
  primary:
    'bg-brand text-white shadow-lift active:bg-brand-dark disabled:bg-mist disabled:text-slate disabled:shadow-none',
  secondary:
    'bg-white text-ink border-2 border-mist active:border-brand active:text-brand-dark disabled:text-slate',
  ghost: 'bg-transparent text-brand-dark active:bg-mint/60',
  danger: 'bg-white text-danger border-2 border-danger/30 active:bg-danger/10',
  dark: 'bg-ink text-white active:bg-ink-soft',
}

export function Button({
  variant = 'primary',
  big = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; big?: boolean }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors select-none
        ${big ? 'min-h-16 px-6 text-lg' : 'min-h-12 px-5 text-base'}
        ${btnStyles[variant]} ${className}`}
    />
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-3xl bg-white shadow-card ${className}`}>{children}</div>
  )
}

export function Field({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate">{label}</span>
      <input
        {...props}
        className={`w-full min-h-13 rounded-2xl border-2 bg-white px-4 text-base text-ink outline-none transition-colors
          placeholder:text-slate/50 focus:border-brand
          ${error ? 'border-danger/60' : 'border-mist'}`}
      />
      {error && <span className="mt-1 block text-sm font-medium text-danger">{error}</span>}
    </label>
  )
}

export function TimeField({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate">{label}</span>
      <input
        type="time"
        {...props}
        className="w-full min-h-14 rounded-2xl border-2 border-mist bg-white px-4 text-center font-display text-xl font-medium tracking-wide text-ink outline-none focus:border-brand"
      />
    </label>
  )
}

export function Chip({
  tone = 'mint',
  children,
}: {
  tone?: 'mint' | 'peach' | 'mist' | 'danger' | 'brand'
  children: ReactNode
}) {
  const tones = {
    mint: 'bg-mint text-brand-deep',
    peach: 'bg-peach/40 text-ink',
    mist: 'bg-mist text-slate',
    danger: 'bg-danger/10 text-danger',
    brand: 'bg-brand text-white',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-6 animate-spin text-brand ${className}`} fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <Spinner className="size-10" />
    </div>
  )
}

export function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      {icon ?? (
        <div className="roof-stripes flex size-16 items-center justify-center rounded-2xl border-2 border-mist">
          <span className="font-display text-2xl text-brand">///</span>
        </div>
      )}
      <p className="max-w-60 text-balance text-slate">{text}</p>
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-sm font-medium uppercase tracking-[0.14em] text-slate">
      {children}
    </h2>
  )
}
