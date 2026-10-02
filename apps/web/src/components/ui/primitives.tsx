import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-2 block text-base font-semibold text-slate-800', className)}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900',
          'placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-900',
        'placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20',
        className,
      )}
      {...props}
    />
  );
});

/** Interruptor ON/OFF acessível, com alvo grande. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-10 w-[72px] items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40',
        checked ? 'bg-brand' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'inline-block h-8 w-8 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-9' : 'translate-x-1',
        )}
      />
    </button>
  );
}

/** Grupo de "chips" selecionáveis (um ativo), com alvos grandes. */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  getLabel,
  ariaLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  getLabel?: (v: T) => string;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={cn(
              'min-h-12 rounded-2xl border-2 px-5 text-base font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40',
              active
                ? 'border-brand bg-brand text-white'
                : 'border-slate-200 bg-white text-slate-700',
            )}
          >
            {getLabel ? getLabel(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}
