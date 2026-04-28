type Props = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: Props) {
  return (
    <div className="rounded-md border border-dashed border-line bg-panel/60 p-6 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted">{message}</p>
    </div>
  );
}
