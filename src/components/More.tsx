import { 
  User, 
  AlertCircle, 
  Building2, 
  Shield, 
  Bell, 
  HelpCircle, 
  Info, 
  ChevronRight,
  LogOut,
  Settings
} from 'lucide-react';

interface MoreProps {
  onNavigate: (screen: string) => void;
  onSignOut: () => void;
  userName?: string;
  userEmail?: string;
  userHealthCard?: string;
}

export default function More({ onNavigate, onSignOut, userName = 'Sarah Johnson', userEmail = 'sarah.johnson@email.com', userHealthCard = '1234-567-890' }: MoreProps) {
  // Get user initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const menuSections = [
    {
      title: 'Profile',
      items: [
        { icon: User, label: 'Profile & Account', screen: null },
        { icon: AlertCircle, label: 'Emergency Profile', screen: 'emergency-profile' },
        { icon: Building2, label: 'Connected Providers', screen: 'manage-providers' },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        { icon: Shield, label: 'Privacy Settings', screen: null },
        { icon: Settings, label: 'Two-Factor Authentication', screen: null },
        { icon: Shield, label: 'Login History', screen: null },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Notification Preferences', screen: 'communication-preferences' },
      ],
    },
    {
      title: 'Help & Support',
      items: [
        { icon: HelpCircle, label: 'FAQs', screen: null },
        { icon: HelpCircle, label: 'Contact Support', screen: null },
        { icon: HelpCircle, label: 'Tutorial Videos', screen: null },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Info, label: 'Version 1.0.0', screen: null },
        { icon: Info, label: 'Privacy Policy', screen: null },
        { icon: Info, label: 'Terms of Service', screen: null },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 text-white p-6 rounded-b-3xl">
        <h1 className="mb-4">Settings</h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-white">{userName}</p>
            <p className="text-sm text-teal-100">{userEmail}</p>
            <p className="text-xs text-teal-200">Health Card: {userHealthCard}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-gray-500 mb-3 px-2">{section.title}</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
              {section.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  onClick={() => item.screen && onNavigate(item.screen)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="flex-1 text-gray-900">{item.label}</span>
                  {item.screen && <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button className="w-full p-4 flex items-center gap-3 hover:bg-red-50 transition-colors" onClick={onSignOut}>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <span className="flex-1 text-red-600">Sign Out</span>
          </button>
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-gray-500">MediLink ID</p>
          <p className="text-xs text-gray-400">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
}