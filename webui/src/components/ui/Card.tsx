import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type Props = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: Props) {
  return <div className={cn('rounded-md border border-line bg-panel p-4', className)} {...props} />;
}
