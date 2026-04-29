import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
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
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  hasNextChapter?: boolean;
  hasPrevChapter?: boolean;
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
  onNextChapter,
  onPrevChapter,
  hasNextChapter,
  hasPrevChapter,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapter?.id]);

  if (!chapter) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-white/30">
        Select a chapter from the sidebar to start reading.
      </div>
    );
  }

  const hasContent = value.trim().length > 0;
  const isGenerating = chapter.status === 'generating' || chapter.status === 'queued';
  const paragraphs = value.split('\n').filter((p) => p.trim());

  return (
    <div className="mx-auto max-w-2xl">
      {/* Floating action bar */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs text-white/25">
          {chapter.wordCount > 0 ? `${chapter.wordCount.toLocaleString()} words` : ''}
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

      {/* Scrollable content area */}
      <div ref={scrollRef} className="overflow-y-auto">
        {/* Chapter title */}
        <h1 className="mb-10 text-center text-2xl font-semibold leading-tight tracking-tight text-white/85">
          {chapter.title}
        </h1>

        {/* Reading mode: borderless infinite text */}
        {hasContent && !isEditing && (
          <div className="text-[15px] leading-[2] text-white/75">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="mb-6 text-justify">
                {paragraph}
              </p>
            ))}

            {/* Chapter navigation */}
            {(hasPrevChapter || hasNextChapter) && (
              <div className="mt-12 flex items-center justify-between border-t border-white/[0.06] pt-6 pb-8">
                {hasPrevChapter ? (
                  <button
                    onClick={onPrevChapter}
                    className="flex items-center gap-1 text-xs text-white/30 transition-colors hover:text-white/60"
                  >
                    <ChevronLeft size={14} />
                    Previous Chapter
                  </button>
                ) : <span />}
                {hasNextChapter ? (
                  <button
                    onClick={onNextChapter}
                    className="flex items-center gap-1 text-xs text-white/30 transition-colors hover:text-white/60"
                  >
                    Next Chapter
                    <ChevronRight size={14} />
                  </button>
                ) : <span />}
              </div>
            )}
          </div>
        )}

        {/* Edit mode */}
        {hasContent && isEditing && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[600px] w-full resize-none border-0 bg-transparent text-[15px] leading-[2] text-white/75 placeholder:text-white/20 focus:outline-none"
          />
        )}

        {/* Generating state */}
        {isGenerating && !hasContent && (
          <div className="flex flex-col items-center py-20 text-center">
            <Loader2 size={22} className="mb-3 animate-spin text-accent" />
            <p className="text-sm text-white/40">Generating chapter...</p>
          </div>
        )}

        {/* Empty state */}
        {!hasContent && !isGenerating && (
          <div className="py-20 text-center text-sm text-white/20">
            This chapter has no content yet. Click Generate to create it.
          </div>
        )}
      </div>
    </div>
  );
}
