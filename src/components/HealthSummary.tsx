import { useState } from 'react';
import { ArrowLeft, Activity, Droplet, Scale, Heart, TrendingUp, TrendingDown, Minus, AlertTriangle, Syringe, Users, Plus, Download, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface HealthSummaryProps {
  onBack: () => void;
}

export default function HealthSummary({ onBack }: HealthSummaryProps) {
  const [selectedVital, setSelectedVital] = useState<string | null>(null);

  const vitals = [
    {
      id: 'bp',
      name: 'Blood Pressure',
      value: '120/80',
      unit: 'mmHg',
      trend: 'stable',
      status: 'normal',
      lastReading: 'Nov 15, 2025',
      icon: Heart,
      color: 'bg-red-100 text-red-600',
    },
    {
      id: 'hr',
      name: 'Heart Rate',
      value: '72',
      unit: 'bpm',
      trend: 'down',
      status: 'improved',
      lastReading: 'Nov 15, 2025',
      icon: Activity,
      color: 'bg-pink-100 text-pink-600',
    },
    {
      id: 'weight',
      name: 'Weight',
      value: '165',
      unit: 'lbs',
      trend: 'up',
      status: 'attention',
      lastReading: 'Nov 1, 2025',
      icon: Scale,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'glucose',
      name: 'Blood Sugar',
      value: '95',
      unit: 'mg/dL',
      trend: 'stable',
      status: 'normal',
      lastReading: 'Nov 15, 2025',
      icon: Droplet,
      color: 'bg-blue-100 text-blue-600',
    },
  ];

  const conditions = [
    {
      name: 'Type 2 Diabetes',
      status: 'Managed',
      diagnosed: 'Jan 2020',
      lastA1C: '6.2%',
      provider: 'Dr. Johnson',
    },
    {
      name: 'Hypertension',
      status: 'Well Controlled',
      diagnosed: 'Mar 2018',
      provider: 'Dr. Johnson',
    },
  ];

  const allergies = [
    { name: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis' },
    { name: 'Shellfish', severity: 'moderate', reaction: 'Hives, swelling' },
    { name: 'Latex', severity: 'mild', reaction: 'Skin irritation' },
  ];

  if (selectedVital) {
    const vital = vitals.find(v => v.id === selectedVital);
    if (!vital) return null;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedVital(null)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-gray-900">{vital.name}</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Reading */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-14 h-14 rounded-full ${vital.color} flex items-center justify-center`}>
                <vital.icon className="w-7 h-7" />
              </div>
              <div className="text-right">
                <p className="text-3xl text-gray-900">{vital.value}</p>
                <p className="text-sm text-gray-500">{vital.unit}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Last reading: {vital.lastReading}</p>
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">Normal range: 90-120 / 60-80 {vital.unit}</p>
            </div>
          </div>

          {/* Graph */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">History</h3>
            <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Graph visualization would go here</p>
            </div>
            <div className="flex gap-2 mt-4">
              {['1M', '3M', '6M', '1Y'].map((period) => (
                <button
                  key={period}
                  className="flex-1 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Log New Reading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Health Summary</h1>
        </div>
        <p className="text-teal-100">Your comprehensive health overview</p>
      </div>

      <div className="p-6 -mt-4 space-y-6">
        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Last Checkup</p>
              <p className="text-gray-900">Oct 15, 2025</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Meds</p>
              <p className="text-gray-900">3</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Allergies</p>
              <p className="text-gray-900">2 Known</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Blood Type</p>
              <p className="text-gray-900">O+</p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4">
            Update Vitals
          </Button>
        </div>

        {/* Vital Signs */}
        <div>
          <h3 className="text-gray-900 mb-3">Vital Signs</h3>
          <div className="grid grid-cols-2 gap-3">
            {vitals.map((vital) => {
              const TrendIcon = vital.trend === 'up' ? TrendingUp : vital.trend === 'down' ? TrendingDown : Minus;
              return (
                <button
                  key={vital.id}
                  onClick={() => setSelectedVital(vital.id)}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-full ${vital.color} flex items-center justify-center mb-3`}>
                    <vital.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{vital.name}</p>
                  <p className="text-xl text-gray-900">{vital.value}</p>
                  <p className="text-xs text-gray-500">{vital.unit}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendIcon className={`w-4 h-4 ${
                      vital.trend === 'up' ? 'text-orange-600' :
                      vital.trend === 'down' ? 'text-green-600' :
                      'text-gray-400'
                    }`} />
                    <span className="text-xs text-gray-500 capitalize">{vital.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Medical Conditions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-4">Medical Conditions</h3>
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={index} className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-gray-900">{condition.name}</h4>
                  <Badge className="bg-green-100 text-green-700 border-0">{condition.status}</Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Diagnosed: {condition.diagnosed}</p>
                  {condition.lastA1C && <p>Last A1C: {condition.lastA1C} (Nov 2025)</p>}
                  <p>Provider: {condition.provider}</p>
                </div>
                <Button size="sm" variant="outline" className="mt-3">
                  View Care Plan
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Allergies & Sensitivities</h3>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {allergies.map((allergy, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                  allergy.severity === 'severe' ? 'text-red-600' :
                  allergy.severity === 'moderate' ? 'text-orange-600' :
                  'text-yellow-600'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-gray-900">{allergy.name}</p>
                    <Badge className={`border-0 ${
                      allergy.severity === 'severe' ? 'bg-red-100 text-red-700' :
                      allergy.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {allergy.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{allergy.reaction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Immunizations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-4">Immunization Record</h3>
          <div className="space-y-3">
            {[
              { name: 'COVID-19', doses: 'Dose 3', date: 'Sept 2025', status: 'current' },
              { name: 'Flu Shot', date: 'Oct 2024', status: 'due', dueSoon: true },
              { name: 'Tetanus', date: '2021', nextDue: 'Due 2031', status: 'current' },
            ].map((vaccine, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Syringe className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="text-gray-900">{vaccine.name}</p>
                    <p className="text-sm text-gray-600">{vaccine.doses || vaccine.date}</p>
                  </div>
                </div>
                {vaccine.dueSoon && (
                  <Badge className="bg-orange-100 text-orange-700 border-0">Due Soon</Badge>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Schedule Immunization
          </Button>
        </div>

        {/* Family History */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Family Health History</h3>
            </div>
            <Button size="sm" variant="outline">Edit</Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">• Heart disease (Father)</p>
            <p className="text-sm text-gray-600">• Type 2 Diabetes (Mother)</p>
            <p className="text-sm text-gray-600">• Breast Cancer (Maternal grandmother)</p>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" className="w-full">
            <Share2 className="w-4 h-4 mr-2" />
            Share Summary
          </Button>
        </div>
      </div>
    </div>
  );
}
