import { Home, Users, Calendar, MessageSquare, FileText, Settings, Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MedilinkIcon } from '@/components/branding/MedilinkIcon';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', page: 'dashboard', icon: Home },
  { name: 'Patients', page: 'patients', icon: Users },
  { name: 'Appointments', page: 'appointments', icon: Calendar },
  { name: 'Messages', page: 'messages', icon: MessageSquare },
  { name: 'Notifications', page: 'notifications', icon: Bell },
  { name: 'Documents', page: 'documents', icon: FileText },
  { name: 'Settings', page: 'settings', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MedilinkIcon className="h-10 w-10 shrink-0" />
            <div>
              <h1 className="font-bold text-gray-900">Medilink ID</h1>
              <p className="text-xs text-gray-600">Staff Portal</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            
            return (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate(item.page);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-600 text-center">
            <p>Medilink ID v2.0</p>
            <p className="mt-1">© 2026 All rights reserved</p>
          </div>
        </div>
      </aside>
    </>
  );
}
