import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto flex w-full max-w-[1600px]">
        <Sidebar />
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
