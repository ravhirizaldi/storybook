import { BookOpenText, FolderOpenDot, Home, Layers3, LogOut, MemoryStick, PlusSquare, Users } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';
import { useAuthStore } from '../../stores/authStore';

function LinkItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-white/50 transition-colors hover:bg-white/5 hover:text-white/80',
          isActive && 'bg-white/[0.07] text-white/90',
        )
      }
    >
      <Icon size={15} strokeWidth={1.8} />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { projectId } = useParams();
  const { user, clearSession } = useAuthStore();

  return (
    <aside className="flex h-dvh w-56 flex-col border-r border-white/[0.06] bg-[#111318]">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        <BookOpenText size={18} strokeWidth={1.8} className="text-accent" />
        <span className="text-sm font-semibold tracking-tight text-white/90">StoryForge</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        <LinkItem to="/" label="Dashboard" icon={Home} />
        <LinkItem to="/projects/new" label="New Project" icon={PlusSquare} />
        <LinkItem to="/" label="Projects" icon={Layers3} />

        {projectId && (
          <>
            <div className="my-3 border-t border-white/[0.06]" />
            <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-white/25">Project</p>
            <LinkItem to={`/projects/${projectId}`} label="Story" icon={FolderOpenDot} />
            <LinkItem to={`/projects/${projectId}/characters`} label="Characters" icon={Users} />
            <LinkItem to={`/projects/${projectId}/memories`} label="Memories" icon={MemoryStick} />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="truncate text-xs text-white/40">{user?.username}</span>
          <button
            onClick={clearSession}
            className="rounded p-1 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
            title="Logout"
          >
            <LogOut size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  );
}
