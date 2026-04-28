type Props = {
  message: string;
};

export function ErrorState({ message }: Props) {
  return (
    <div className="rounded-md border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
      {message}
    </div>
  );
}
