import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}
