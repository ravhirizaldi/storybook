import { BookOpenText, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';

export function Navbar() {
  const { user, clearSession } = useAuthStore();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-5">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <BookOpenText size={17} />
          StoryForge AI
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{user?.username}</span>
          <Button variant="ghost" onClick={clearSession}>
            <LogOut size={14} />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
