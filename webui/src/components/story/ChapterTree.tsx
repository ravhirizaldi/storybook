import type { Chapter, Part } from '../../lib/api/types';
import { StatusPill } from '../ui/StatusPill';

type Props = {
  parts: Part[];
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string) => void;
};

export function ChapterTree({ parts, chapters, selectedChapterId, onSelectChapter }: Props) {
  return (
    <div className="space-y-4">
      {parts.map((part) => {
        const partChapters = chapters.filter((chapter) => chapter.partId === part.id);
        return (
          <section key={part.id} className="rounded-md border border-line bg-panel p-3">
            <div className="mb-2">
              <h4 className="text-sm font-semibold">{part.title}</h4>
              <p className="text-xs text-muted">{part.description}</p>
            </div>
            <ul className="space-y-1">
              {partChapters.map((chapter) => (
                <li key={chapter.id}>
                  <button
                    className={`w-full rounded-md border p-2 text-left text-xs ${
                      selectedChapterId === chapter.id
                        ? 'border-accent/60 bg-accent/10'
                        : 'border-line hover:border-accent/40'
                    }`}
                    onClick={() => onSelectChapter(chapter.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{chapter.title}</span>
                      <StatusPill status={chapter.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
