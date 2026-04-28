import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export function Dropdown({ className, children, ...props }: Props) {
  return (
    <select
      className={cn(
        'w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-white focus:border-accent focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
