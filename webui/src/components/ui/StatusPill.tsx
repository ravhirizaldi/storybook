import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

type Props = {
  status:
    | 'pending'
    | 'queued'
    | 'generating'
    | 'completed'
    | 'failed'
    | 'draft'
    | 'outlining'
    | 'ready';
};

const statusClasses: Record<Props['status'], string> = {
  pending: 'border-slate-400/30 text-slate-300',
  queued: 'border-blue-400/30 text-blue-300',
  generating: 'border-amber-400/30 text-amber-300',
  completed: 'border-emerald-400/30 text-emerald-300',
  failed: 'border-rose-400/30 text-rose-300',
  draft: 'border-slate-400/30 text-slate-300',
  outlining: 'border-blue-400/30 text-blue-300',
  ready: 'border-emerald-400/30 text-emerald-300',
};

const spinningStatuses = new Set(['outlining', 'generating', 'queued']);

export function StatusPill({ status }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        statusClasses[status],
      )}
    >
      {spinningStatuses.has(status) && (
        <Loader2 size={10} className="animate-spin" />
      )}
      {status}
    </span>
  );
}
