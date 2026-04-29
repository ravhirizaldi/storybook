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

const PAGE_HEIGHT = 900;
const PAGE_PADDING_Y = 56;
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y * 2;

function splitIntoPages(paragraphs: string[]): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let height = 0;
  const lineHeight = 32;
  const paragraphMargin = 20;
  const charsPerLine = 70;

  for (const p of paragraphs) {
    const lines = Math.ceil(p.length / charsPerLine);
    const pHeight = lines * lineHeight + paragraphMargin;
    if (height + pHeight > CONTENT_HEIGHT && current.length > 0) {
      pages.push(current);
      current = [p];
      height = pHeight;
    } else {
      current.push(p);
      height += pHeight;
    }
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

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
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        Select a chapter from the sidebar to start reading.
      </div>
    );
  }

  const hasContent = value.trim().length > 0;
  const isGenerating = chapter.status === 'generating' || chapter.status === 'queued';
  const paragraphs = value.split('\n').filter((p) => p.trim());
  const pages = hasContent && !isEditing ? splitIntoPages(paragraphs) : [];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Action bar */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-line bg-panel px-3 py-2">
        <span className="text-xs text-muted">
          {chapter.wordCount > 0 ? `${chapter.wordCount.toLocaleString()} words` : 'No content yet'}
          {pages.length > 1 && !isEditing && ` · ${pages.length} pages`}
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

      {/* Scrollable page area */}
      <div
        ref={scrollRef}
        className="max-h-[calc(100dvh-160px)] overflow-y-auto scroll-smooth"
        style={{ scrollSnapType: 'y proximity' }}
      >
        {/* Reading mode: pages */}
        {hasContent && !isEditing &&
          pages.map((pageParagraphs, pageIdx) => (
            <article
              key={pageIdx}
              className="mb-6 rounded-lg border border-line/50 bg-[#1a1d23] shadow-lg"
              style={{
                minHeight: `${PAGE_HEIGHT}px`,
                padding: `${PAGE_PADDING_Y}px 64px`,
                scrollSnapAlign: 'start',
              }}
            >
              {pageIdx === 0 && (
                <h1 className="mb-8 text-center text-2xl font-semibold leading-tight tracking-tight text-white/90">
                  {chapter.title}
                </h1>
              )}
              <div className="text-[15px] leading-8 text-white/80">
                {pageParagraphs.map((paragraph, i) => (
                  <p key={i} className="mb-5 text-justify">
                    {paragraph}
                  </p>
                ))}
              </div>
              {/* Page number */}
              <div className="mt-auto pt-6 text-center text-[11px] text-muted/40">
                {pages.length > 1 && `${pageIdx + 1} / ${pages.length}`}
              </div>

              {/* Chapter navigation on last page */}
              {pageIdx === pages.length - 1 && (hasPrevChapter || hasNextChapter) && (
                <div className="mt-4 flex items-center justify-between border-t border-line/30 pt-4">
                  {hasPrevChapter ? (
                    <button
                      onClick={onPrevChapter}
                      className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-white"
                    >
                      <ChevronLeft size={14} />
                      Previous Chapter
                    </button>
                  ) : <span />}
                  {hasNextChapter ? (
                    <button
                      onClick={onNextChapter}
                      className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-white"
                    >
                      Next Chapter
                      <ChevronRight size={14} />
                    </button>
                  ) : <span />}
                </div>
              )}
            </article>
          ))}

        {/* Edit mode: single page with textarea */}
        {hasContent && isEditing && (
          <article
            className="mb-6 rounded-lg border border-line/50 bg-[#1a1d23] shadow-lg"
            style={{ padding: `${PAGE_PADDING_Y}px 64px` }}
          >
            <h1 className="mb-8 text-center text-2xl font-semibold leading-tight tracking-tight text-white/90">
              {chapter.title}
            </h1>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[600px] w-full resize-none border-0 bg-transparent text-[15px] leading-8 text-white/80 placeholder:text-muted focus:outline-none"
            />
          </article>
        )}

        {/* Generating state */}
        {isGenerating && !hasContent && (
          <article
            className="mb-6 rounded-lg border border-line/50 bg-[#1a1d23] shadow-lg"
            style={{
              minHeight: `${PAGE_HEIGHT}px`,
              padding: `${PAGE_PADDING_Y}px 64px`,
            }}
          >
            <h1 className="mb-8 text-center text-2xl font-semibold leading-tight tracking-tight text-white/90">
              {chapter.title}
            </h1>
            <div className="flex flex-col items-center py-16 text-center">
              <Loader2 size={24} className="mb-3 animate-spin text-accent" />
              <p className="text-sm text-muted">Generating chapter...</p>
            </div>
          </article>
        )}

        {/* Empty state */}
        {!hasContent && !isGenerating && (
          <article
            className="mb-6 rounded-lg border border-line/50 bg-[#1a1d23] shadow-lg"
            style={{
              minHeight: `${PAGE_HEIGHT}px`,
              padding: `${PAGE_PADDING_Y}px 64px`,
            }}
          >
            <h1 className="mb-8 text-center text-2xl font-semibold leading-tight tracking-tight text-white/90">
              {chapter.title}
            </h1>
            <div className="py-16 text-center text-sm text-muted/60">
              This chapter has no content yet. Click Generate to create it.
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
