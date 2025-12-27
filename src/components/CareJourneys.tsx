import { useState } from 'react';
import { ArrowLeft, Activity, CheckCircle, Circle, TrendingUp, Calendar, Users, FileText, Plus, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface CareJourneysProps {
  onBack: () => void;
}

export default function CareJourneys({ onBack }: CareJourneysProps) {
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);

  const journeys = [
    {
      id: 'diabetes',
      name: 'Type 2 Diabetes Management',
      status: 'active',
      progress: 75,
      duration: '18 months',
      currentPhase: 'Optimizing Control',
    },
    {
      id: 'hypertension',
      name: 'Hypertension Control',
      status: 'active',
      progress: 90,
      duration: '3 years',
      currentPhase: 'Maintenance',
    },
  ];

  if (selectedJourney === 'diabetes') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSelectedJourney(null)} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white">Type 2 Diabetes</h1>
          </div>
          <p className="text-purple-100">Your journey: 18 months</p>
        </div>

        <div className="p-6 -mt-4 space-y-6">
          {/* Progress Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Journey Progress</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="absolute left-4 top-0 w-0.5 bg-teal-600" style={{ height: '75%' }} />
              
              <div className="space-y-6 relative">
                {/* Phase 1 - Completed */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 pb-6">
                    <h4 className="text-gray-900 mb-1">Diagnosis & Education</h4>
                    <p className="text-sm text-gray-600 mb-2">Jan 2020</p>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-700">✓ Lab results reviewed</p>
                      <p className="text-sm text-gray-700">✓ Educational materials completed</p>
                      <p className="text-sm text-gray-700">✓ Dietitian consultation</p>
                    </div>
                  </div>
                </div>

                {/* Phase 2 - Completed */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 pb-6">
                    <h4 className="text-gray-900 mb-1">Medication Started</h4>
                    <p className="text-sm text-gray-600 mb-2">Feb 2020</p>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-700">✓ Metformin 500mg prescribed</p>
                      <p className="text-sm text-gray-700">✓ Side effects monitored</p>
                      <p className="text-sm text-gray-700">✓ Dosage optimized to 1000mg</p>
                    </div>
                  </div>
                </div>

                {/* Phase 3 - Current */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                    <Activity className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-gray-900">Optimizing Control</h4>
                      <Badge className="bg-blue-100 text-blue-700 border-0">In Progress</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Nov 2025</p>
                    <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-700">Last A1C: 6.2%</p>
                          <Badge className="bg-green-100 text-green-700 border-0">✓ Target Met</Badge>
                        </div>
                        <p className="text-xs text-gray-600">Target: under 7%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">Weight maintenance: On track</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">Next appointment: Jan 15, 2026</p>
                      </div>
                      <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                        Schedule 6-Month Blood Work
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Phase 4 - Upcoming */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                    <Circle className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-600 mb-1">Annual Eye Exam</h4>
                    <p className="text-sm text-gray-500 mb-2">Due: Dec 2025</p>
                    <Button size="sm" variant="outline">Schedule Now</Button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                    <Circle className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-600 mb-1">Foot Care Checkup</h4>
                    <p className="text-sm text-gray-500">Due: Feb 2026</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Insights */}
          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-gray-900">Your Progress</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-gray-900 mb-1">A1C Improvement</p>
                <p className="text-2xl text-green-600">8.5% → 6.2%</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-gray-900 mb-1">Weight Loss</p>
                <p className="text-2xl text-green-600">-20 lbs</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-gray-900 mb-1">Medication Adherence</p>
                <p className="text-2xl text-green-600">98%</p>
              </div>
            </div>
          </div>

          {/* Care Team */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Your Care Team</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Dr. Sarah Johnson', role: 'Primary Care' },
                { name: 'Dr. Mike Chen', role: 'Endocrinologist' },
                { name: 'Rachel Kim, RD', role: 'Registered Dietitian' },
              ].map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                  <Button size="sm" variant="outline">Message</Button>
                </div>
              ))}
            </div>
          </div>

          {/* Educational Resources */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Learn More</h3>
            </div>
            <div className="space-y-2">
              {[
                'Understanding Type 2 Diabetes',
                'Nutrition Guide for Diabetes',
                'Exercise Tips',
                'Managing Stress and Blood Sugar',
              ].map((resource, index) => (
                <button key={index} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <span className="text-gray-900">{resource}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Care Journeys</h1>
        </div>
        <p className="text-purple-100">Track your health journey milestones</p>
      </div>

      <div className="p-6 -mt-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-gray-900 mb-1">What are Care Journeys?</h3>
          <p className="text-sm text-gray-700">
            Visual timelines showing your healthcare journey for specific conditions, with guidance and milestones to help you manage your health.
          </p>
        </div>

        <div>
          <h3 className="text-gray-900 mb-3">Active Journeys</h3>
          <div className="space-y-3">
            {journeys.map((journey) => (
              <button
                key={journey.id}
                onClick={() => setSelectedJourney(journey.id)}
                className="w-full bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-gray-900 mb-1">{journey.name}</h3>
                    <p className="text-sm text-gray-600">{journey.duration} into your journey</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900">{journey.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all"
                      style={{ width: `${journey.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    {journey.currentPhase}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Start New Journey
        </Button>
      </div>
    </div>
  );
}