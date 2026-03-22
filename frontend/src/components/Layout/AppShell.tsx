'use client';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAlertFeed } from '@/hooks/useAlertFeed';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  useAlertFeed(); // mount WS listener globally

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
