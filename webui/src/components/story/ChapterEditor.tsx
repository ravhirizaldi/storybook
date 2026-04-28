import { RefreshCcw, Save, Sparkles } from 'lucide-react';
import type { Chapter } from '../../lib/api/types';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

type Props = {
  chapter: Chapter | null;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onContinue: () => void;
  onSummarize: () => void;
  saving?: boolean;
  actionPending?: boolean;
};

export function ChapterEditor({
  chapter,
  value,
  onChange,
  onSave,
  onGenerate,
  onRegenerate,
  onContinue,
  onSummarize,
  saving,
  actionPending,
}: Props) {
  if (!chapter) {
    return (
      <div className="rounded-md border border-dashed border-line bg-panel p-10 text-sm text-muted">
        Select chapter from tree.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-panel p-3">
        <div>
          <h2 className="text-lg font-semibold">{chapter.title}</h2>
          <p className="text-xs text-muted">
            Words: {chapter.wordCount} | Characters: {chapter.charCount}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onGenerate} disabled={actionPending}>
            <Sparkles size={14} />
            Generate
          </Button>
          <Button variant="secondary" onClick={onContinue} disabled={actionPending}>
            Continue
          </Button>
          <Button variant="secondary" onClick={onRegenerate} disabled={actionPending}>
            <RefreshCcw size={14} />
            Regenerate
          </Button>
          <Button variant="secondary" onClick={onSummarize} disabled={actionPending}>
            Summarize
          </Button>
          <Button onClick={onSave} disabled={saving}>
            <Save size={14} />
            Save
          </Button>
        </div>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[560px] font-sans leading-7"
      />
    </section>
  );
}
