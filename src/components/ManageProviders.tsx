import { ArrowLeft, Search, Building2, TestTube, Stethoscope, Hospital, CheckCircle, X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';

interface ManageProvidersProps {
  connectedProviders: string[];
  onConnect: (provider: string) => void;
  onRemove: (provider: string) => void;
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

export default function ManageProviders({ connectedProviders, onConnect, onRemove, onBack }: ManageProvidersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProviders, setShowAddProviders] = useState(false);

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = 
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.type.toLowerCase().includes(searchTerm.toLowerCase());
    const notConnected = !connectedProviders.includes(provider.name);
    return matchesSearch && notConnected;
  });

  const connectedProviderObjects = providers.filter(provider => 
    connectedProviders.includes(provider.name)
  );

  if (showAddProviders) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setShowAddProviders(false)} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">Add Provider</h1>
          <div className="w-6" />
        </div>

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

        {searchTerm && filteredProviders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No providers found</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => {
                onConnect(provider.name);
                setShowAddProviders(false);
              }}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${provider.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <provider.logo className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-gray-900">{provider.name}</p>
                  <p className="text-sm text-gray-500">{provider.type}</p>
                </div>
                <Plus className="w-5 h-5 text-teal-600" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 text-white p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Connected Providers</h1>
          <div className="w-6" />
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm mb-1">Total Providers</p>
              <p className="text-3xl">{connectedProviders.length}</p>
            </div>
            <Button
              onClick={() => setShowAddProviders(true)}
              className="bg-white text-teal-600 hover:bg-teal-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {connectedProviders.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No Providers Connected</h3>
            <p className="text-gray-600 mb-6">
              Connect your healthcare providers to access all your medical records in one place.
            </p>
            <Button
              onClick={() => setShowAddProviders(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Provider
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connectedProviderObjects.map((provider) => (
              <div
                key={provider.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${provider.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <provider.logo className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{provider.name}</p>
                    <p className="text-sm text-gray-500">{provider.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <button
                      onClick={() => onRemove(provider.name)}
                      className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {connectedProviders.length > 0 && (
          <div className="mt-6 bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 mb-1">HL7 FHIR Compliant</h3>
                <p className="text-sm text-gray-600">
                  All your providers are connected using secure, industry-standard health data protocols.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}