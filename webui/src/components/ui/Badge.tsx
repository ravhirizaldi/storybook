import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type Props = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex rounded border border-line px-2 py-0.5 text-xs text-muted',
        className,
      )}
      {...props}
    />
  );
}
