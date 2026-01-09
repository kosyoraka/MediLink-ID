import { useMemo, useState } from 'react';
import { ArrowLeft, AlertCircle, Calendar, MessageCircle, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

interface SymptomCheckerProps {
  onBack: () => void;
}

type Step = 'input' | 'result';

type DurationOption = 'Less than 1 day' | '1-3 days' | '4-7 days' | 'Over a week';
type SeverityOption = 'Mild' | 'Moderate' | 'Severe';

type GuidanceResult = {
  urgencyLevel: 'Emergency' | 'Urgent' | 'Soon' | 'Self-care';
  urgencyTitle: string;
  urgencyMessage: string;
  possibleCauses: Array<{
    name: string;
    likelihood: 'Common' | 'Possible' | 'Less Likely';
    reasoning?: string;
  }>;
  selfCareTips: string[];
  redFlags: string[];
  nextSteps: string[];
  disclaimer: string;
};

export default function SymptomChecker({ onBack }: SymptomCheckerProps) {
  const [step, setStep] = useState<Step>('input');
  const [symptoms, setSymptoms] = useState('');
  const [selectedBody, setSelectedBody] = useState<string[]>([]);
  const [duration, setDuration] = useState<DurationOption | ''>('');
  const [severity, setSeverity] = useState<SeverityOption | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuidanceResult | null>(null);

  const bodyParts = useMemo(
    () => [
      { id: 'head', label: 'Head', position: 'top-4 left-1/2 -translate-x-1/2' },
      { id: 'chest', label: 'Chest', position: 'top-20 left-1/2 -translate-x-1/2' },
      { id: 'stomach', label: 'Stomach', position: 'top-32 left-1/2 -translate-x-1/2' },
      { id: 'left-arm', label: 'Left Arm', position: 'top-20 left-8' },
      { id: 'right-arm', label: 'Right Arm', position: 'top-20 right-8' },
    ],
    []
  );

  async function getGuidance() {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/ai/symptom-guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyParts: selectedBody,
          symptoms,
          duration,
          severity,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { result: GuidanceResult };
      setResult(data.result);
      setStep('result');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function resetToInput() {
    setStep('input');
    setResult(null);
  }

  const canSubmit = symptoms.trim().length > 0 && selectedBody.length > 0 && !!duration && !!severity && !loading;

  if (step === 'result') {
    if (!result) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <button onClick={resetToInput} className="text-gray-600" type="button">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-gray-900">Your Results</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">No results yet.</p>
            <Button onClick={resetToInput}>Back</Button>
          </div>
        </div>
      );
    }

    const urgencyStyle =
      result.urgencyLevel === 'Emergency'
        ? { wrap: 'bg-red-50 border-red-200', icon: 'text-red-600' }
        : result.urgencyLevel === 'Urgent'
        ? { wrap: 'bg-orange-50 border-orange-200', icon: 'text-orange-600' }
        : result.urgencyLevel === 'Soon'
        ? { wrap: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-600' }
        : { wrap: 'bg-teal-50 border-teal-200', icon: 'text-teal-600' };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button onClick={resetToInput} className="text-gray-600" type="button">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-gray-900">Your Results</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Urgency Level */}
          <div className={`${urgencyStyle.wrap} border-2 rounded-xl p-5`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-6 h-6 ${urgencyStyle.icon} flex-shrink-0`} />
              <div>
                <h3 className="text-gray-900 mb-1">{result.urgencyTitle}</h3>
                <p className="text-sm text-gray-700">{result.urgencyMessage}</p>
              </div>
            </div>
          </div>

          {/* Possible Causes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-gray-900 mb-3">Possible Causes</h3>

            <div className="space-y-3">
              {result.possibleCauses?.slice(0, 3).map((cause, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">{cause.name}</span>
                    <Badge
                      className={`${
                        cause.likelihood === 'Common'
                          ? 'bg-blue-100 text-blue-700'
                          : cause.likelihood === 'Possible'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-100 text-gray-600'
                      } border-0`}
                    >
                      {cause.likelihood}
                    </Badge>
                  </div>
                  {cause.reasoning ? <p className="text-sm text-gray-600 mt-2">{cause.reasoning}</p> : null}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="text-gray-900">Important:</span> {result.disclaimer}
              </p>
            </div>
          </div>

          {/* Self-Care Tips */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-gray-900 mb-3">Self-Care Tips</h3>
            <ul className="space-y-2">
              {(result.selfCareTips || []).slice(0, 8).map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-teal-600 flex-shrink-0">•</span>
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* When to Seek Emergency Care */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-red-900 mb-3">Seek Emergency Care If:</h3>
            <ul className="space-y-2">
              {(result.redFlags || []).slice(0, 8).map((flag, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-600 flex-shrink-0">•</span>
                  <span className="text-gray-700">{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next steps */}
          {result.nextSteps?.length ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-gray-900 mb-3">Next Steps</h3>
              <ul className="space-y-2">
                {result.nextSteps.slice(0, 6).map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-600 flex-shrink-0">•</span>
                    <span className="text-gray-700">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Actions (placeholder for later integrations) */}
          <div className="space-y-3">
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12" type="button">
              <Calendar className="w-5 h-5 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" className="w-full h-12" type="button">
              <MessageCircle className="w-5 h-5 mr-2" />
              Message Your Provider
            </Button>
            <Button variant="outline" className="w-full h-12" type="button">
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
          <button onClick={onBack} className="text-white" type="button">
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
                  setSelectedBody((prev) =>
                    prev.includes(part.id) ? prev.filter((p) => p !== part.id) : [...prev, part.id]
                  );
                }}
                className={`absolute ${part.position} w-12 h-12 rounded-full border-2 transition-all ${
                  selectedBody.includes(part.id) ? 'bg-red-500 border-red-600' : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
                type="button"
                aria-label={part.label}
              />
            ))}
          </div>

          {selectedBody.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedBody.map((id) => {
                const part = bodyParts.find((p) => p.id === id);
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
            {(['Less than 1 day', '1-3 days', '4-7 days', 'Over a week'] as DurationOption[]).map((option) => {
              const selected = duration === option;
              return (
                <button
                  key={option}
                  onClick={() => setDuration(option)}
                  className={`p-3 border-2 rounded-lg transition-all text-sm ${
                    selected ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-teal-500 hover:bg-teal-50'
                  }`}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-3">How severe are your symptoms?</h3>
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: 'Mild', color: 'border-yellow-200 hover:border-yellow-500 hover:bg-yellow-50' },
              { label: 'Moderate', color: 'border-orange-200 hover:border-orange-500 hover:bg-orange-50' },
              { label: 'Severe', color: 'border-red-200 hover:border-red-500 hover:bg-red-50' },
            ] as const).map((s) => {
              const selected = severity === s.label;
              return (
                <button
                  key={s.label}
                  onClick={() => setSeverity(s.label)}
                  className={`p-3 border-2 rounded-lg transition-all ${
                    selected ? 'border-teal-600 bg-teal-50' : s.color
                  }`}
                  type="button"
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          onClick={getGuidance}
          disabled={!canSubmit}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
          type="button"
        >
          {loading ? 'Getting guidance...' : 'Get Guidance'}
        </Button>
      </div>
    </div>
  );
}
