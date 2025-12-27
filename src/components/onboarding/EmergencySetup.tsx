import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';

interface EmergencySetupProps {
  onFinish: () => void;
}

export default function EmergencySetup({ onFinish }: EmergencySetupProps) {
  const [settings, setSettings] = useState({
    bloodType: true,
    allergies: true,
    chronicConditions: true,
    medications: true,
    emergencyContacts: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen p-6 pb-24">
      <button className="mb-8 text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
        </div>
        <p className="text-sm text-gray-600">Step 3 of 3</p>
      </div>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="mb-2 text-gray-900">Emergency Profile</h1>
          <p className="text-gray-600">
            In an emergency, first responders can tap your phone to see critical health information.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <h3 className="text-gray-900 p-4 border-b border-gray-200">
          Information to share in emergencies:
        </h3>
        
        <div className="divide-y divide-gray-200">
          {[
            { key: 'bloodType' as const, label: 'Blood Type', description: 'Your blood type for transfusions' },
            { key: 'allergies' as const, label: 'Allergies', description: 'Drug and environmental allergies' },
            { key: 'chronicConditions' as const, label: 'Chronic Conditions', description: 'Long-term health conditions' },
            { key: 'medications' as const, label: 'Current Medications', description: 'All medications you\'re taking' },
            { key: 'emergencyContacts' as const, label: 'Emergency Contacts', description: 'People to notify in an emergency' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4">
              <div className="flex-1">
                <p className="text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={() => toggleSetting(item.key)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-700">
          <span className="text-gray-900">Privacy Note:</span> This information is only accessible when you or emergency services activate emergency mode.
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 max-w-md mx-auto">
        <div className="flex gap-3">
          <Button 
            onClick={onFinish} 
            variant="outline"
            className="flex-1 h-12"
          >
            Skip for Now
          </Button>
          <Button onClick={onFinish} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12">
            Finish Setup
          </Button>
        </div>
      </div>
    </div>
  );
}