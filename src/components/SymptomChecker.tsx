import { useState } from 'react';
import { ArrowLeft, AlertCircle, Calendar, MessageCircle, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

interface SymptomCheckerProps {
  onBack: () => void;
}

export default function SymptomChecker({ onBack }: SymptomCheckerProps) {
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [symptoms, setSymptoms] = useState('');
  const [selectedBody, setSelectedBody] = useState<string[]>([]);

  const bodyParts = [
    { id: 'head', label: 'Head', position: 'top-4 left-1/2 -translate-x-1/2' },
    { id: 'chest', label: 'Chest', position: 'top-20 left-1/2 -translate-x-1/2' },
    { id: 'stomach', label: 'Stomach', position: 'top-32 left-1/2 -translate-x-1/2' },
    { id: 'left-arm', label: 'Left Arm', position: 'top-20 left-8' },
    { id: 'right-arm', label: 'Right Arm', position: 'top-20 right-8' },
  ];

  if (step === 'result') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('input')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-gray-900">Your Results</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Urgency Level */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <h3 className="text-gray-900 mb-1">See a Provider Within This Week</h3>
                <p className="text-sm text-gray-700">
                  Your symptoms suggest you should see a healthcare provider soon, but this is not an emergency.
                </p>
              </div>
            </div>
          </div>

          {/* Possible Causes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-gray-900 mb-3">Possible Causes</h3>
            <div className="space-y-3">
              {[
                { name: 'Common Cold', likelihood: 'Common', color: 'bg-blue-100 text-blue-700' },
                { name: 'Seasonal Allergies', likelihood: 'Possible', color: 'bg-gray-100 text-gray-700' },
                { name: 'Sinus Infection', likelihood: 'Less Likely', color: 'bg-gray-100 text-gray-600' },
              ].map((cause, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{cause.name}</span>
                  <Badge className={`${cause.color} border-0`}>{cause.likelihood}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="text-gray-900">Important:</span> This is not a diagnosis. Only a healthcare provider can diagnose your condition.
              </p>
            </div>
          </div>

          {/* Self-Care Tips */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-gray-900 mb-3">Self-Care Tips</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-teal-600 flex-shrink-0">•</span>
                <span className="text-gray-700">Get plenty of rest</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 flex-shrink-0">•</span>
                <span className="text-gray-700">Stay hydrated with water and warm fluids</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 flex-shrink-0">•</span>
                <span className="text-gray-700">Use a humidifier to ease congestion</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 flex-shrink-0">•</span>
                <span className="text-gray-700">Over-the-counter pain relievers if needed</span>
              </li>
            </ul>
          </div>

          {/* When to Seek Emergency Care */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-red-900 mb-3">Seek Emergency Care If:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span className="text-gray-700">Difficulty breathing or shortness of breath</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span className="text-gray-700">Chest pain or pressure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span className="text-gray-700">High fever that doesn't respond to medication</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0">•</span>
                <span className="text-gray-700">Severe or worsening symptoms</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12">
              <Calendar className="w-5 h-5 mr-2" />
              Book Appointment with Dr. Johnson
            </Button>
            <Button variant="outline" className="w-full h-12">
              <MessageCircle className="w-5 h-5 mr-2" />
              Message Your Provider
            </Button>
            <Button variant="outline" className="w-full h-12">
              <MapPin className="w-5 h-5 mr-2" />
              Find Nearest Walk-in Clinic
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Symptom Checker</h1>
        </div>
        <p className="text-orange-100">Get guidance on your symptoms</p>
      </div>

      <div className="p-6 -mt-4 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                <span className="text-gray-900">Not for emergencies.</span> If you're experiencing a medical emergency, call 911 or go to your nearest emergency room.
              </p>
            </div>
          </div>
        </div>

        {/* Body Map */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Where does it hurt?</h3>
          <p className="text-sm text-gray-600 mb-4">Tap the area where you're experiencing symptoms</p>
          
          <div className="relative w-48 h-64 mx-auto bg-gray-50 rounded-lg">
            {bodyParts.map((part) => (
              <button
                key={part.id}
                onClick={() => {
                  setSelectedBody(prev => 
                    prev.includes(part.id) 
                      ? prev.filter(p => p !== part.id)
                      : [...prev, part.id]
                  );
                }}
                className={`absolute ${part.position} w-12 h-12 rounded-full border-2 transition-all ${
                  selectedBody.includes(part.id)
                    ? 'bg-red-500 border-red-600'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              />
            ))}
          </div>

          {selectedBody.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedBody.map((id) => {
                const part = bodyParts.find(p => p.id === id);
                return (
                  <Badge key={id} className="bg-red-100 text-red-700 border-0">
                    {part?.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Symptoms Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-3">Describe your symptoms</h3>
          <Textarea
            placeholder="E.g., I have a headache, runny nose, and feel tired..."
            className="min-h-32 mb-3"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
          <div className="text-sm text-gray-600 mb-3">
            <p className="mb-1">Tell us:</p>
            <ul className="space-y-1 ml-4">
              <li>• When did symptoms start?</li>
              <li>• How severe are they?</li>
              <li>• Any other symptoms?</li>
            </ul>
          </div>
        </div>

        {/* Duration */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-3">How long have you had these symptoms?</h3>
          <div className="grid grid-cols-2 gap-2">
            {['Less than 1 day', '1-3 days', '4-7 days', 'Over a week'].map((option) => (
              <button
                key={option}
                className="p-3 border-2 border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all text-sm"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-3">How severe are your symptoms?</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Mild', color: 'border-yellow-200 hover:border-yellow-500 hover:bg-yellow-50' },
              { label: 'Moderate', color: 'border-orange-200 hover:border-orange-500 hover:bg-orange-50' },
              { label: 'Severe', color: 'border-red-200 hover:border-red-500 hover:bg-red-50' },
            ].map((severity) => (
              <button
                key={severity.label}
                className={`p-3 border-2 ${severity.color} rounded-lg transition-all`}
              >
                {severity.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => setStep('result')}
          disabled={!symptoms || selectedBody.length === 0}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
        >
          Get Guidance
        </Button>
      </div>
    </div>
  );
}
