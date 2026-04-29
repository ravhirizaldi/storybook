import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Folder, FileText } from 'lucide-react';
import type { Chapter, Part } from '../../lib/api/types';
import { StatusPill } from '../ui/StatusPill';
import { cn } from '../../lib/utils/cn';

type Props = {
  parts: Part[];
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
};

function ArcItem({ title }: { title: string }) {
  return (
    <li className="flex items-center gap-1.5 py-0.5 pl-8 text-[11px] text-muted">
      <span className="h-1 w-1 shrink-0 rounded-full bg-muted/50" />
      {title}
    </li>
  );
}

function ChapterItem({
  chapter,
  isSelected,
  onSelect,
}: {
  chapter: Chapter;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [expanded, setExpanded] = useState(false);
  const arcs = chapter.arcsJson ?? [];
  const hasArcs = arcs.length > 0;

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <li ref={ref} data-chapter-id={chapter.id}>
      <button
        className={cn(
          'flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs transition-colors',
          isSelected
            ? 'bg-accent/10 text-white'
            : 'text-muted hover:bg-white/5 hover:text-white',
        )}
        onClick={() => {
          onSelect();
          if (hasArcs) setExpanded((prev) => !prev);
        }}
      >
        {hasArcs ? (
          expanded ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />
        ) : (
          <FileText size={12} className="shrink-0 text-muted/50" />
        )}
        <span className="flex-1 truncate font-medium">{chapter.title}</span>
        <StatusPill status={chapter.status} />
      </button>
      {hasArcs && expanded && (
        <ul className="mt-0.5">
          {arcs.map((arc, i) => (
            <ArcItem key={i} title={arc.title} />
          ))}
        </ul>
      )}
    </li>
  );
}

function PartFolder({
  part,
  chapters,
  selectedChapterId,
  onSelectChapter,
  defaultExpanded,
}: {
  part: Part;
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (id: string) => void;
  defaultExpanded: boolean;
}) {
  const hasSelected = chapters.some((c) => c.id === selectedChapterId);
  const [expanded, setExpanded] = useState(defaultExpanded || hasSelected);

  useEffect(() => {
    if (hasSelected && !expanded) {
      setExpanded(true);
    }
  }, [hasSelected, expanded]);

  return (
    <div>
      <button
        className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs font-semibold text-white/80 hover:bg-white/5 hover:text-white"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? (
          <>
            <ChevronDown size={12} className="shrink-0" />
            <FolderOpen size={13} className="shrink-0 text-accent/70" />
          </>
        ) : (
          <>
            <ChevronRight size={12} className="shrink-0" />
            <Folder size={13} className="shrink-0 text-muted" />
          </>
        )}
        <span className="flex-1 truncate">{part.title}</span>
        <span className="text-[10px] text-muted">{chapters.length}</span>
      </button>
      {expanded && (
        <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-line/30 pl-1">
          {chapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isSelected={selectedChapterId === chapter.id}
              onSelect={() => onSelectChapter(chapter.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChapterTree({ parts, chapters, selectedChapterId, onSelectChapter }: Props) {
  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        const partChapters = chapters.filter((chapter) => chapter.partId === part.id);
        return (
          <PartFolder
            key={part.id}
            part={part}
            chapters={partChapters}
            selectedChapterId={selectedChapterId}
            onSelectChapter={onSelectChapter}
            defaultExpanded={i === 0}
          />
        );
      })}
    </div>
  );
}
