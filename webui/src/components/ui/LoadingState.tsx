type Props = {
  label?: string;
};

export function LoadingState({ label = 'Loading...' }: Props) {
  return (
    <div className="rounded-md border border-line bg-panel p-6 text-sm text-muted">
      <div className="h-2 w-1/2 animate-pulse rounded bg-white/10" />
      <p className="mt-3">{label}</p>
    </div>
  );
}
