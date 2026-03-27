import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  unreadCount: number;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, onLogout, unreadCount, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onLogout={onLogout}
          onMenuClick={() => setSidebarOpen(true)}
          onNotificationsClick={() => onNavigate("notifications")}
          unreadCount={unreadCount}
        />
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
