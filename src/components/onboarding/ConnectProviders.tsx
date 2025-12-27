import { ArrowLeft, Search, Building2, TestTube, Stethoscope, Hospital, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useState } from 'react';

interface ConnectProvidersProps {
  connectedProviders: string[];
  onConnect: (provider: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const providers = [
  { id: 'sunnybrook', name: 'Sunnybrook Hospital', type: 'Hospital', logo: Hospital, color: 'bg-blue-100 text-blue-600' },
  { id: 'mount-sinai', name: 'Mount Sinai Hospital', type: 'Hospital', logo: Hospital, color: 'bg-purple-100 text-purple-600' },
  { id: 'toronto-general', name: 'Toronto General Hospital', type: 'Hospital', logo: Hospital, color: 'bg-blue-100 text-blue-600' },
  { id: 'sickkids', name: 'The Hospital for Sick Children (SickKids)', type: 'Hospital', logo: Hospital, color: 'bg-pink-100 text-pink-600' },
  { id: 'st-michaels', name: "St. Michael's Hospital", type: 'Hospital', logo: Hospital, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'womens-college', name: "Women's College Hospital", type: 'Hospital', logo: Hospital, color: 'bg-purple-100 text-purple-600' },
  { id: 'toronto-western', name: 'Toronto Western Hospital', type: 'Hospital', logo: Hospital, color: 'bg-blue-100 text-blue-600' },
  { id: 'st-josephs', name: "St. Joseph's Health Centre", type: 'Hospital', logo: Hospital, color: 'bg-green-100 text-green-600' },
  { id: 'north-york-general', name: 'North York General Hospital', type: 'Hospital', logo: Hospital, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'scarborough-health', name: 'Scarborough Health Network', type: 'Hospital', logo: Hospital, color: 'bg-teal-100 text-teal-600' },
  { id: 'trillium', name: 'Trillium Health Partners', type: 'Hospital', logo: Hospital, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'william-osler', name: 'William Osler Health System', type: 'Hospital', logo: Hospital, color: 'bg-sky-100 text-sky-600' },
  { id: 'humber-river', name: 'Humber River Hospital', type: 'Hospital', logo: Hospital, color: 'bg-violet-100 text-violet-600' },
  { id: 'michael-garron', name: 'Michael Garron Hospital', type: 'Hospital', logo: Hospital, color: 'bg-fuchsia-100 text-fuchsia-600' },
  { id: 'ottawa-hospital', name: 'The Ottawa Hospital', type: 'Hospital', logo: Hospital, color: 'bg-red-100 text-red-600' },
  { id: 'ottawa-civic', name: 'Ottawa Civic Hospital', type: 'Hospital', logo: Hospital, color: 'bg-rose-100 text-rose-600' },
  { id: 'cheo', name: "Children's Hospital of Eastern Ontario (CHEO)", type: 'Hospital', logo: Hospital, color: 'bg-pink-100 text-pink-600' },
  { id: 'kingston-health', name: 'Kingston Health Sciences Centre', type: 'Hospital', logo: Hospital, color: 'bg-amber-100 text-amber-600' },
  { id: 'hamilton-health', name: 'Hamilton Health Sciences', type: 'Hospital', logo: Hospital, color: 'bg-orange-100 text-orange-600' },
  { id: 'st-josephs-hamilton', name: "St. Joseph's Healthcare Hamilton", type: 'Hospital', logo: Hospital, color: 'bg-lime-100 text-lime-600' },
  { id: 'london-health', name: 'London Health Sciences Centre', type: 'Hospital', logo: Hospital, color: 'bg-green-100 text-green-600' },
  { id: 'st-josephs-london', name: "St. Joseph's Health Care London", type: 'Hospital', logo: Hospital, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'windsor-regional', name: 'Windsor Regional Hospital', type: 'Hospital', logo: Hospital, color: 'bg-teal-100 text-teal-600' },
  { id: 'grand-river', name: 'Grand River Hospital', type: 'Hospital', logo: Hospital, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'royal-victoria', name: 'Royal Victoria Regional Health Centre', type: 'Hospital', logo: Hospital, color: 'bg-sky-100 text-sky-600' },
  { id: 'lifelabs', name: 'LifeLabs', type: 'Laboratory', logo: TestTube, color: 'bg-green-100 text-green-600' },
  { id: 'dynacare', name: 'Dynacare', type: 'Laboratory', logo: TestTube, color: 'bg-blue-100 text-blue-600' },
  { id: 'gamma-dynacare', name: 'Gamma-Dynacare Medical Laboratories', type: 'Laboratory', logo: TestTube, color: 'bg-purple-100 text-purple-600' },
  { id: 'shoppers', name: 'Shoppers Drug Mart', type: 'Pharmacy', logo: Building2, color: 'bg-red-100 text-red-600' },
  { id: 'rexall', name: 'Rexall Pharmacy', type: 'Pharmacy', logo: Building2, color: 'bg-blue-100 text-blue-600' },
  { id: 'costco-pharmacy', name: 'Costco Pharmacy', type: 'Pharmacy', logo: Building2, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'family-doctor', name: 'Dr. Sarah Johnson', type: 'Family Doctor', logo: Stethoscope, color: 'bg-teal-100 text-teal-600' },
  { id: 'family-doctor-2', name: 'Dr. Michael Chen', type: 'Family Doctor', logo: Stethoscope, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'walk-in', name: 'Maple Leaf Medical', type: 'Walk-in Clinic', logo: Building2, color: 'bg-orange-100 text-orange-600' },
  { id: 'appletree', name: 'Appletree Medical Group', type: 'Walk-in Clinic', logo: Building2, color: 'bg-green-100 text-green-600' },
  { id: 'medvisit', name: 'Medvisit Walk-In Clinic', type: 'Walk-in Clinic', logo: Building2, color: 'bg-lime-100 text-lime-600' },
];

export default function ConnectProviders({ connectedProviders, onConnect, onNext, onBack }: ConnectProvidersProps) {
  const handleConnect = (providerName: string) => {
    onConnect(providerName);
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = 
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.type.toLowerCase().includes(searchTerm.toLowerCase());
    const notConnected = !connectedProviders.includes(provider.name);
    return matchesSearch && notConnected;
  });

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
          <div className="h-2 flex-1 bg-gray-200 rounded-full" />
        </div>
        <p className="text-sm text-gray-600">Step 2 of 3</p>
      </div>

      <h1 className="mb-2 text-gray-900">Connect your providers</h1>
      <p className="text-gray-600 mb-6">
        Link your healthcare providers to access all your medical records in one place.
      </p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="search"
          placeholder="Search for your provider..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {connectedProviders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-700 mb-4">Connected ({connectedProviders.length})</h2>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            {connectedProviders.map((providerName, index) => {
              const provider = providers.find(p => p.name === providerName);
              return (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-900">{providerName}</p>
                    {provider && <p className="text-sm text-gray-600">{provider.type}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-gray-700 mb-4">Popular Providers</h2>
        <div className="space-y-3">
          {filteredProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleConnect(provider.name)}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:bg-teal-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${provider.color} flex items-center justify-center flex-shrink-0`}>
                  <provider.logo className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-gray-900">{provider.name}</h3>
                  <p className="text-sm text-gray-500">{provider.type}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnect(provider.name);
                  }}
                >
                  Connect
                </Button>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 max-w-md mx-auto">
        <Button onClick={onNext} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12">
          Continue
        </Button>
        <p className="text-center text-sm text-gray-500 mt-3">
          You can add more providers later
        </p>
      </div>
    </div>
  );
}