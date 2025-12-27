import { ArrowLeft, Calendar, TestTube, Syringe, Activity, Heart, Eye, Utensils, Moon, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface RecommendationsProps {
  onBack: () => void;
}

export default function Recommendations({ onBack }: RecommendationsProps) {
  const preventiveCareScore = 80;

  const screenings = [
    {
      name: 'Mammogram',
      why: 'Routine breast cancer screening',
      frequency: 'Every 2 years (ages 50-74)',
      status: 'due',
      lastDone: 'Oct 2023',
      dueDate: 'Oct 2025',
      category: 'Overdue',
    },
    {
      name: 'Colonoscopy',
      why: 'Colon cancer screening',
      frequency: 'Every 10 years (ages 50+)',
      status: 'upcoming',
      lastDone: 'Never',
      dueDate: 'Within 6 months',
      category: 'Upcoming',
    },
    {
      name: 'Eye Exam',
      why: 'Diabetic retinopathy screening',
      frequency: 'Annually for diabetics',
      status: 'due',
      lastDone: 'Nov 2024',
      dueDate: 'Nov 2025',
      category: 'Due This Month',
    },
  ];

  const immunizations = [
    {
      name: 'Flu Shot',
      status: 'Available now',
      dueDate: 'Recommended annually',
      priority: 'high',
    },
    {
      name: 'COVID-19 Booster',
      status: 'Due Jan 2026',
      dueDate: '6 months since last dose',
      priority: 'medium',
    },
    {
      name: 'Shingles Vaccine',
      status: 'Eligible at age 50',
      dueDate: 'Recommended for age 50+',
      priority: 'low',
    },
  ];

  const lifestyleRecs = [
    {
      title: 'Increase Physical Activity',
      current: '90 minutes/week',
      goal: '150 minutes/week',
      icon: Activity,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Improve Sleep Hygiene',
      current: '5.9 hours/night',
      goal: '7-9 hours/night',
      icon: Moon,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Heart Health Monitoring',
      current: 'Weekly checks',
      goal: 'Continue monitoring',
      icon: Heart,
      color: 'bg-red-100 text-red-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Recommendations</h1>
        </div>
        <p className="text-green-100">Personalized health guidance for you</p>
      </div>

      <div className="p-6 -mt-4 space-y-6">
        {/* Preventive Care Score */}
        <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl border border-teal-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 mb-1">Preventive Care Score</h3>
              <p className="text-sm text-gray-600">You're doing great!</p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (1 - 0.8)}`}
                  className="text-green-600"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl text-gray-900">{preventiveCareScore}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Completed: 8/10</span>
            <span className="text-gray-600">Pending: 2</span>
          </div>
        </div>

        {/* Screening Tests */}
        <div>
          <h3 className="text-gray-900 mb-3">Screening Tests</h3>
          <div className="space-y-3">
            {screenings.map((screening, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl border-2 p-5 ${
                  screening.category === 'Overdue' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <TestTube className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-gray-900">{screening.name}</h4>
                      <Badge className={`${
                        screening.category === 'Overdue' ? 'bg-red-100 text-red-700' :
                        screening.category === 'Due This Month' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      } border-0`}>
                        {screening.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{screening.why}</p>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p>Frequency: {screening.frequency}</p>
                      <p>Last done: {screening.lastDone}</p>
                      <p>Due: {screening.dueDate}</p>
                    </div>
                  </div>
                </div>
                
                <details className="mb-3">
                  <summary className="text-sm text-teal-600 cursor-pointer">Learn More</summary>
                  <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded-lg">
                    This screening is recommended by Ontario health guidelines based on your age and health history.
                  </p>
                </details>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                    Schedule Now
                  </Button>
                  <Button size="sm" variant="outline">
                    Remind Me Later
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Immunizations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Syringe className="w-5 h-5 text-gray-600" />
            <h3 className="text-gray-900">Immunizations</h3>
          </div>
          <div className="space-y-3">
            {immunizations.map((vaccine, index) => (
              <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-gray-900 mb-1">{vaccine.name}</p>
                  <p className="text-sm text-gray-600 mb-1">{vaccine.status}</p>
                  <p className="text-xs text-gray-500">{vaccine.dueDate}</p>
                </div>
                {vaccine.priority === 'high' && (
                  <Button size="sm">Schedule</Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lifestyle Recommendations */}
        <div>
          <h3 className="text-gray-900 mb-3">Lifestyle Recommendations</h3>
          <div className="space-y-3">
            {lifestyleRecs.map((rec, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full ${rec.color} flex items-center justify-center flex-shrink-0`}>
                    <rec.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-900 mb-2">{rec.title}</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Current: {rec.current}</p>
                      <p className="text-gray-600">Goal: {rec.goal}</p>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  View Resources
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Completion Tracker */}
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-gray-900">You're Up to Date With</h3>
              <p className="text-sm text-gray-600">8 out of 10 recommendations</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>✓ Annual Physical (Oct 2025)</p>
            <p>✓ Blood Pressure Monitoring</p>
            <p>✓ A1C Testing</p>
            <p>✓ Dental Checkup</p>
          </div>
        </div>
      </div>
    </div>
  );
}
