import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="flex h-dvh bg-[#0d0f13]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5">{children}</main>
    </div>
  );
}
