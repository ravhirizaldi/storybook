import { Book, FolderOpenDot, Home, Layers3, MemoryStick, PlusSquare } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';

function LinkItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-white',
          isActive && 'bg-white/10 text-white',
        )
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { projectId } = useParams();
  return (
    <aside className="sticky top-14 h-[calc(100dvh-56px)] w-64 overflow-y-auto border-r border-line p-3">
      <nav className="space-y-1">
        <LinkItem to="/" label="Dashboard" icon={Home} />
        <LinkItem to="/projects/new" label="Create Project" icon={PlusSquare} />
        {projectId ? (
          <>
            <LinkItem to={`/projects/${projectId}`} label="Story Project" icon={FolderOpenDot} />
            <LinkItem to={`/projects/${projectId}/characters`} label="Characters" icon={Book} />
            <LinkItem to={`/projects/${projectId}/memories`} label="Memories" icon={MemoryStick} />
          </>
        ) : (
          <div className="mt-3 rounded-md border border-dashed border-line p-3 text-xs text-muted">
            Open project to access chapter tree, characters, and memories.
          </div>
        )}
        <LinkItem to="/" label="Projects" icon={Layers3} />
      </nav>
    </aside>
  );
}
