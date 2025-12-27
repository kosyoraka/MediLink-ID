import { ArrowLeft, Pill, Bell, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';

interface MedicationsProps {
  onBack: () => void;
}

const medications = [
  {
    id: '1',
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily in the morning',
    prescriber: 'Dr. Sarah Johnson',
    startDate: 'Jan 15, 2024',
    refills: 3,
    pharmacy: 'Shoppers Drug Mart - Yonge St',
    purpose: 'Blood pressure management',
  },
  {
    id: '2',
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily with meals',
    prescriber: 'Dr. Sarah Johnson',
    startDate: 'Mar 10, 2024',
    refills: 2,
    pharmacy: 'Shoppers Drug Mart - Yonge St',
    purpose: 'Type 2 diabetes management',
  },
  {
    id: '3',
    name: 'Atorvastatin',
    dosage: '20mg',
    frequency: 'Once daily at bedtime',
    prescriber: 'Dr. Michael Chen',
    startDate: 'May 5, 2024',
    refills: 5,
    pharmacy: 'Rexall Pharmacy',
    purpose: 'Cholesterol management',
  },
];

export default function Medications({ onBack }: MedicationsProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">Medications</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-gray-900 mb-1">Medication Reminders</h3>
              <p className="text-sm text-gray-600">Set up reminders to never miss a dose</p>
            </div>
          </div>
        </div>

        {medications.map((med) => (
          <div key={med.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Pill className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">{med.name}</h3>
                  <p className="text-gray-600">{med.dosage} • {med.frequency}</p>
                  <p className="text-sm text-gray-500 mt-1">Prescribed by {med.prescriber}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Started:</span>
                  <span className="text-gray-900">{med.startDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Refills remaining:</span>
                  <span className="text-gray-900">{med.refills}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pharmacy:</span>
                  <span className="text-gray-900">{med.pharmacy}</span>
                </div>
              </div>

              <details className="mb-4">
                <summary className="text-sm text-teal-600 cursor-pointer flex items-center gap-1">
                  What is this for?
                  <ChevronDown className="w-4 h-4" />
                </summary>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{med.purpose}</p>
                </div>
              </details>

              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Set Reminder</span>
                </div>
                <Switch />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Request Refill
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  View History
                </Button>
              </div>
            </div>

            <div className="bg-teal-50 px-5 py-3 border-t border-teal-100">
              <button className="text-sm text-teal-700 flex items-center gap-1">
                Add to Emergency Profile
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
