import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { API_BASE } from "@/config/api";

interface EmergencySetupProps {
  onFinish: () => void;
  onBack?: () => void;
}

export default function EmergencySetup({ onFinish, onBack }: EmergencySetupProps) {
  const [settings, setSettings] = useState({
    bloodType: true,
    allergies: true,
    chronicConditions: true,
    medications: true,
    emergencyContacts: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patientId = localStorage.getItem('patientId');

  useEffect(() => {
    if (!patientId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/patients/${patientId}/emergency-profile`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.status === 404) {
          // Not created yet — keep defaults
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || `Load failed (${res.status})`);

        setSettings({
          bloodType: !!data.share_blood_type,
          allergies: !!data.share_allergies,
          chronicConditions: !!data.share_chronic_conditions,
          medications: !!data.share_current_medications,
          emergencyContacts: !!data.share_emergency_contacts,
        });
      } catch (err: any) {
        setError(err?.message ?? 'Could not load emergency settings');
      }
    };

    load();
  }, [patientId]);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinish = async () => {
    setError(null);

    if (!patientId) {
      setError('Missing patientId. Please sign in again.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/patients/${patientId}/emergency-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shareBloodType: settings.bloodType,
          shareAllergies: settings.allergies,
          shareChronicConditions: settings.chronicConditions,
          shareCurrentMedications: settings.medications,
          shareEmergencyContacts: settings.emergencyContacts,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Save failed (${res.status})`);

      localStorage.setItem('emergencyComplete', 'true');
      onFinish();
    } catch (err: any) {
      setError(err?.message ?? 'Could not save emergency settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // If you want: localStorage.setItem('emergencyComplete', 'false');
    onFinish();
  };

  return (
    <div className="min-h-screen p-6 pb-24">
      <button onClick={onBack} className="mb-8 text-gray-600">
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

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <h3 className="text-gray-900 p-4 border-b border-gray-200">
          Information to share in emergencies:
        </h3>

        <div className="divide-y divide-gray-200">
          {[
            { key: 'bloodType' as const, label: 'Blood Type', description: 'Your blood type for transfusions' },
            { key: 'allergies' as const, label: 'Allergies', description: 'Drug and environmental allergies' },
            { key: 'chronicConditions' as const, label: 'Chronic Conditions', description: 'Long-term health conditions' },
            { key: 'medications' as const, label: 'Current Medications', description: "All medications you're taking" },
            { key: 'emergencyContacts' as const, label: 'Emergency Contacts', description: 'People to notify in an emergency' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4">
              <div className="flex-1">
                <p className="text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <Switch checked={settings[item.key]} onCheckedChange={() => toggleSetting(item.key)} />
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
          <Button onClick={handleSkip} variant="outline" className="flex-1 h-12" disabled={loading}>
            Skip for Now
          </Button>
          <Button
            onClick={handleFinish}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Finish Setup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
