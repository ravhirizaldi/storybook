import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'border-accent/70 bg-accent text-slate-900 hover:bg-[#54b0ff]',
        variant === 'secondary' && 'border-line bg-panel hover:border-accent/40 hover:text-accent',
        variant === 'ghost' && 'border-transparent bg-transparent hover:bg-white/5',
        variant === 'danger' && 'border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20',
        className,
      )}
      {...props}
    />
  );
}
