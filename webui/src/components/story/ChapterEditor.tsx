import { useEffect, useRef } from 'react';
import { Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import type { Chapter } from '../../lib/api/types';
import { Button } from '../ui/Button';

type Props = {
  chapter: Chapter | null;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  saving?: boolean;
  actionPending?: boolean;
  isEditing?: boolean;
  onToggleEdit?: () => void;
};

export function ChapterEditor({
  chapter,
  value,
  onChange,
  onSave,
  onGenerate,
  onRegenerate,
  saving,
  actionPending,
  isEditing,
  onToggleEdit,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapter?.id]);

  if (!chapter) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        Select a chapter from the sidebar to start reading.
      </div>
    );
  }

  const hasContent = value.trim().length > 0;
  const isGenerating = chapter.status === 'generating' || chapter.status === 'queued';

  return (
    <div ref={containerRef} className="mx-auto max-w-3xl">
      {/* Floating action bar */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-line bg-panel px-3 py-2">
        <span className="text-xs text-muted">
          {chapter.wordCount > 0 ? `${chapter.wordCount.toLocaleString()} words` : 'No content yet'}
        </span>
        <div className="flex items-center gap-2">
          {!hasContent && !isGenerating && (
            <Button variant="secondary" onClick={onGenerate} disabled={actionPending}>
              <Sparkles size={13} />
              Generate
            </Button>
          )}
          {hasContent && (
            <Button variant="secondary" onClick={onRegenerate} disabled={actionPending}>
              <RefreshCcw size={13} />
              Regenerate
            </Button>
          )}
          {hasContent && onToggleEdit && (
            <Button variant="ghost" onClick={onToggleEdit}>
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          )}
          {isEditing && (
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Reading page */}
      <article className="rounded-lg border border-line/50 bg-[#1a1d23] px-10 py-10 shadow-lg md:px-16 md:py-14">
        {/* Chapter title */}
        <h1 className="mb-8 text-center text-2xl font-semibold leading-tight tracking-tight text-white/90">
          {chapter.title}
        </h1>

        {/* Generating state */}
        {isGenerating && !hasContent && (
          <div className="flex flex-col items-center py-16 text-center">
            <Loader2 size={24} className="mb-3 animate-spin text-accent" />
            <p className="text-sm text-muted">Generating chapter...</p>
          </div>
        )}

        {/* Content: reading mode or edit mode */}
        {hasContent && !isEditing && (
          <div className="prose-story text-[15px] leading-8 text-white/80">
            {value.split('\n').map((paragraph, i) =>
              paragraph.trim() ? (
                <p key={i} className="mb-5 text-justify">
                  {paragraph}
                </p>
              ) : null,
            )}
          </div>
        )}

        {hasContent && isEditing && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[600px] w-full resize-none border-0 bg-transparent text-[15px] leading-8 text-white/80 placeholder:text-muted focus:outline-none"
          />
        )}

        {/* Empty state */}
        {!hasContent && !isGenerating && (
          <div className="py-16 text-center text-sm text-muted/60">
            This chapter has no content yet. Click Generate to create it.
          </div>
        )}
      </article>
    </div>
  );
}
