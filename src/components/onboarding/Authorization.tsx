import { ArrowLeft, Lock, Check, Hospital } from 'lucide-react';
import { Button } from '../ui/button';

interface AuthorizationProps {
  provider: string;
  onAuthorize: () => void;
}

export default function Authorization({ provider, onAuthorize }: AuthorizationProps) {
  const permissions = [
    'Medical history and visit notes',
    'Lab and test results',
    'Current medications',
    'Appointment history',
  ];

  return (
    <div className="min-h-screen p-6">
      <button className="mb-8 text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Hospital className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-center mb-2 text-gray-900">Authorization Required</h1>
        <p className="text-center text-gray-600">
          MediLink ID needs permission to access your records from
        </p>
        <p className="text-center text-gray-900 mt-1">
          {provider}
        </p>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-3 mb-4">
          <Lock className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-gray-900 mb-1">What we'll access:</h3>
          </div>
        </div>
        <ul className="space-y-3">
          {permissions.map((permission, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{permission}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8">
        <p className="text-sm text-gray-600">
          Your data is encrypted and secure. You can revoke access at any time from your settings.
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={onAuthorize} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12">
          Authorize Access
        </Button>
        <Button variant="outline" className="w-full h-12">
          Cancel
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 mt-6">
        <Lock className="w-4 h-4 text-gray-400" />
        <p className="text-sm text-gray-500">256-bit encryption</p>
      </div>
    </div>
  );
}
