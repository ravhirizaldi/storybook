import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type Props = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}
