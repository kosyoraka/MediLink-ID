import { useState } from 'react';
import { ArrowLeft, ChevronRight, Plus, Edit2, Eye, EyeOff, AlertCircle, CheckCircle2, Clock, MapPin, User, FileText, Activity, Cigarette, Wine, Briefcase, Plane, Baby, Brain, History } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface MedicalHistoryProps {
  onBack: () => void;
}

type HistorySection = 'overview' | 'surgical' | 'hospitalizations' | 'emergency' | 'chronic' | 'medications' | 'problems' | 'social' | 'reproductive' | 'mental' | 'audit';

export default function MedicalHistory({ onBack }: MedicalHistoryProps) {
  const [activeSection, setActiveSection] = useState<HistorySection>('overview');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [sensitiveVisible, setSensitiveVisible] = useState(false);

  // Mock data for surgical history
  const surgeries = [
    {
      id: '1',
      procedure: 'Appendectomy',
      date: 'March 2015',
      facility: 'Toronto General Hospital',
      surgeon: 'Dr. Williams',
      indication: 'Acute appendicitis',
      complications: 'None',
      hasReport: true,
    },
    {
      id: '2',
      procedure: 'Wisdom Teeth Extraction',
      date: 'July 2018',
      facility: 'Toronto Dental Surgery Centre',
      surgeon: 'Dr. Chen',
      indication: 'Impacted wisdom teeth',
      complications: 'Minor swelling',
      hasReport: false,
    },
  ];

  // Mock data for hospitalizations
  const hospitalizations = [
    {
      id: '1',
      reason: 'Pneumonia',
      admissionDate: 'Jan 10, 2020',
      dischargeDate: 'Jan 17, 2020',
      lengthOfStay: '7 days',
      hospital: 'Sunnybrook Hospital',
      attendingPhysician: 'Dr. Sarah Johnson',
      hasDischarge: true,
    },
  ];

  // Mock data for emergency visits
  const emergencyVisits = [
    {
      id: '1',
      date: 'Nov 5, 2025',
      time: '11:30 PM',
      reason: 'Severe migraine',
      facility: 'Toronto Western ER',
      diagnosis: 'Migraine with aura',
      treatment: 'IV fluids, pain management',
    },
    {
      id: '2',
      date: 'Aug 12, 2024',
      time: '3:45 PM',
      reason: 'Allergic reaction',
      facility: 'Mount Sinai ER',
      diagnosis: 'Anaphylaxis (shellfish)',
      treatment: 'Epinephrine, antihistamines',
    },
  ];

  // Mock data for chronic conditions
  const chronicConditions = [
    {
      id: '1',
      condition: 'Hypertension',
      diagnosedDate: 'March 2019',
      status: 'Active - Well Controlled',
      complications: 'None',
      currentTreatment: 'Lisinopril 10mg daily',
    },
    {
      id: '2',
      condition: 'Type 2 Diabetes',
      diagnosedDate: 'June 2020',
      status: 'Active - Managed',
      complications: 'None',
      currentTreatment: 'Metformin 500mg twice daily, diet modification',
    },
  ];

  // Mock data for medication history
  const pastMedications = [
    {
      id: '1',
      name: 'Amoxicillin',
      startDate: 'Nov 1, 2025',
      endDate: 'Nov 10, 2025',
      duration: '10 days',
      reason: 'Completed course',
      indication: 'Sinus infection',
    },
    {
      id: '2',
      name: 'Ibuprofen 400mg',
      startDate: 'July 2024',
      endDate: 'Aug 2024',
      duration: '1 month',
      reason: 'Side effects (stomach upset)',
      indication: 'Chronic back pain',
    },
  ];

  // Mock data for problem list
  const activeProblems = [
    {
      id: '1',
      problem: 'Hypertension',
      dateIdentified: 'March 2019',
      status: 'Active',
      managingProvider: 'Dr. Sarah Johnson',
      hasCarePlan: true,
    },
    {
      id: '2',
      problem: 'Type 2 Diabetes',
      dateIdentified: 'June 2020',
      status: 'Active',
      managingProvider: 'Dr. Sarah Johnson',
      hasCarePlan: true,
    },
  ];

  const resolvedProblems = [
    {
      id: '1',
      problem: 'Acute appendicitis',
      dateIdentified: 'March 2015',
      dateResolved: 'March 2015',
      status: 'Resolved',
      resolution: 'Surgical intervention',
    },
  ];

  // Render overview with all sections
  if (activeSection === 'overview') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">Medical History</h1>
        </div>

        <div className="p-4 space-y-3">
          {/* Surgical History */}
          <button
            onClick={() => setActiveSection('surgical')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Surgical History</h3>
                <p className="text-sm text-gray-500">{surgeries.length} procedures</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Hospitalizations */}
          <button
            onClick={() => setActiveSection('hospitalizations')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Hospitalizations</h3>
                <p className="text-sm text-gray-500">{hospitalizations.length} admission</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Emergency Visits */}
          <button
            onClick={() => setActiveSection('emergency')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Emergency Visits</h3>
                <p className="text-sm text-gray-500">{emergencyVisits.length} visits</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Chronic Conditions */}
          <button
            onClick={() => setActiveSection('chronic')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Chronic Conditions</h3>
                <p className="text-sm text-gray-500">{chronicConditions.length} active conditions</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Medication History */}
          <button
            onClick={() => setActiveSection('medications')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Medication History</h3>
                <p className="text-sm text-gray-500">Past medications & allergies</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Problem List */}
          <button
            onClick={() => setActiveSection('problems')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Problem List</h3>
                <p className="text-sm text-gray-500">{activeProblems.length} active, {resolvedProblems.length} resolved</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Social History */}
          <button
            onClick={() => setActiveSection('social')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Social History</h3>
                <p className="text-sm text-gray-500">Lifestyle & occupational history</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Reproductive History */}
          <button
            onClick={() => setActiveSection('reproductive')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Baby className="w-6 h-6 text-pink-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-gray-900">Reproductive History</h3>
                  {!sensitiveVisible && <EyeOff className="w-4 h-4 text-gray-400" />}
                </div>
                <p className="text-sm text-gray-500">Privacy protected</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Mental Health History */}
          <button
            onClick={() => setActiveSection('mental')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-gray-900">Mental Health History</h3>
                  {!sensitiveVisible && <EyeOff className="w-4 h-4 text-gray-400" />}
                </div>
                <p className="text-sm text-gray-500">Privacy protected</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Edit History */}
          <button
            onClick={() => setActiveSection('audit')}
            className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <History className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900">Edit History</h3>
                <p className="text-sm text-gray-500">Audit trail & accuracy log</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Surgical History Section
  if (activeSection === 'surgical') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Surgical History</h1>
          </div>
          <button className="text-teal-600">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {surgeries.map((surgery) => (
            <div key={surgery.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-gray-900 mb-1">{surgery.procedure}</h3>
                  <p className="text-sm text-gray-500">{surgery.date}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-0">Completed</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Facility</p>
                    <p className="text-gray-900">{surgery.facility}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Surgeon</p>
                    <p className="text-gray-900">{surgery.surgeon}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Indication</p>
                    <p className="text-gray-900">{surgery.indication}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Complications</p>
                    <p className="text-gray-900">{surgery.complications}</p>
                  </div>
                </div>
              </div>

              {surgery.hasReport && (
                <Button variant="outline" className="w-full mt-4">
                  <FileText className="w-4 h-4 mr-2" />
                  View Operative Report
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Hospitalizations Section
  if (activeSection === 'hospitalizations') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Hospitalizations</h1>
          </div>
          <button className="text-teal-600">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {hospitalizations.map((hosp) => (
            <div key={hosp.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-gray-900 mb-1">{hosp.reason}</h3>
                  <p className="text-sm text-gray-500">{hosp.admissionDate} - {hosp.dischargeDate}</p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-0">{hosp.lengthOfStay}</Badge>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Hospital</p>
                    <p className="text-gray-900">{hosp.hospital}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Attending Physician</p>
                    <p className="text-gray-900">{hosp.attendingPhysician}</p>
                  </div>
                </div>
              </div>

              {hosp.hasDischarge && (
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  View Discharge Summary
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Emergency Visits Section
  if (activeSection === 'emergency') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Emergency Visits</h1>
          </div>
          <button className="text-teal-600">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {emergencyVisits.map((visit) => (
            <div key={visit.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="mb-3">
                <h3 className="text-gray-900 mb-1">{visit.reason}</h3>
                <p className="text-sm text-gray-500">{visit.date} • {visit.time}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Facility</p>
                    <p className="text-gray-900">{visit.facility}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Diagnosis</p>
                    <p className="text-gray-900">{visit.diagnosis}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500">Treatment</p>
                    <p className="text-gray-900">{visit.treatment}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Chronic Conditions Section
  if (activeSection === 'chronic') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Chronic Conditions</h1>
          </div>
          <button className="text-teal-600">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          {/* Timeline View */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-gray-900 mb-4">Condition Timeline</h3>
            <div className="space-y-4">
              {chronicConditions.map((condition, index) => (
                <div key={condition.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-purple-600 rounded-full" />
                    {index < chronicConditions.length - 1 && (
                      <div className="w-0.5 h-full bg-purple-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm text-gray-500 mb-1">{condition.diagnosedDate}</p>
                    <p className="text-gray-900">{condition.condition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Cards */}
          <div className="space-y-3">
            {chronicConditions.map((condition) => (
              <div key={condition.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-gray-900 mb-1">{condition.condition}</h3>
                    <p className="text-sm text-gray-500">Diagnosed: {condition.diagnosedDate}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="text-gray-900">{condition.status}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Current Treatment</p>
                    <p className="text-gray-900">{condition.currentTreatment}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Complications</p>
                    <p className="text-gray-900">{condition.complications}</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">
                  View Treatment History
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Medication History Section
  if (activeSection === 'medications') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Medication History</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-gray-900 mb-3">Past Medications</h3>
            <div className="space-y-3">
              {pastMedications.map((med) => (
                <div key={med.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-gray-900 mb-1">{med.name}</h3>
                      <p className="text-sm text-gray-500">{med.startDate} - {med.endDate}</p>
                    </div>
                    <Badge className="bg-gray-100 text-gray-700 border-0">{med.duration}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500">Indication</p>
                      <p className="text-gray-900">{med.indication}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Reason Discontinued</p>
                      <p className="text-gray-900">{med.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-gray-900 mb-3">Medication Allergies</h3>
            <div className="bg-white rounded-xl border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-gray-900 mb-1">Penicillin</h3>
                  <p className="text-sm text-gray-600">Reaction: Severe rash, difficulty breathing</p>
                  <p className="text-sm text-gray-500 mt-1">Reported: March 2010</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Problem List Section
  if (activeSection === 'problems') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Problem List</h1>
          </div>
          <button className="text-teal-600">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-gray-900 mb-3">Active Problems</h3>
            <div className="space-y-3">
              {activeProblems.map((problem) => (
                <div key={problem.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-gray-900 mb-1">{problem.problem}</h3>
                      <p className="text-sm text-gray-500">Identified: {problem.dateIdentified}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 border-0">{problem.status}</Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">Managing Provider</p>
                      <p className="text-gray-900">{problem.managingProvider}</p>
                    </div>
                  </div>

                  {problem.hasCarePlan && (
                    <Button variant="outline" className="w-full">
                      View Care Plan
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-gray-900 mb-3">Resolved Problems</h3>
            <div className="space-y-3">
              {resolvedProblems.map((problem) => (
                <div key={problem.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-gray-900 mb-1">{problem.problem}</h3>
                      <p className="text-sm text-gray-500">
                        {problem.dateIdentified} - {problem.dateResolved}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-0">{problem.status}</Badge>
                  </div>

                  <div className="text-sm">
                    <p className="text-gray-500">Resolution</p>
                    <p className="text-gray-900">{problem.resolution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Social History Section
  if (activeSection === 'social') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Social History</h1>
          </div>
          <button className="text-teal-600">
            <Edit2 className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Smoking History */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Cigarette className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="text-gray-900">Smoking History</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Current Status</p>
                <p className="text-gray-900">Former smoker</p>
              </div>
              <div>
                <p className="text-gray-500">Pack-Years</p>
                <p className="text-gray-900">5 pack-years</p>
              </div>
              <div>
                <p className="text-gray-500">Quit Date</p>
                <p className="text-gray-900">January 2018</p>
              </div>
            </div>
          </div>

          {/* Alcohol Use */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Wine className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-gray-900">Alcohol Use</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Current Usage</p>
                <p className="text-gray-900">Occasional - Social drinking only</p>
              </div>
              <div>
                <p className="text-gray-500">Frequency</p>
                <p className="text-gray-900">2-3 drinks per week</p>
              </div>
            </div>
          </div>

          {/* Occupation History */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-gray-900">Occupation History</h3>
            </div>
            <div className="space-y-3">
              <div className="text-sm">
                <p className="text-gray-900 mb-1">Software Engineer</p>
                <p className="text-gray-500">2015 - Present</p>
                <p className="text-sm text-gray-600 mt-1">Exposure: Prolonged computer use</p>
              </div>
            </div>
          </div>

          {/* Travel History */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Plane className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-gray-900">Recent Travel History</h3>
            </div>
            <div className="text-sm">
              <p className="text-gray-900 mb-1">Mexico - Cancun</p>
              <p className="text-gray-500">October 2025 (7 days)</p>
              <p className="text-sm text-gray-600 mt-1">No illness reported</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reproductive History Section
  if (activeSection === 'reproductive') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Reproductive History</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4" />
            <p>This information is private and protected</p>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <button
              onClick={() => setSensitiveVisible(!sensitiveVisible)}
              className="flex items-center gap-2 text-teal-600 mb-4"
            >
              {sensitiveVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{sensitiveVisible ? 'Hide' : 'Show'} Information</span>
            </button>

            {sensitiveVisible ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Pregnancies</p>
                  <p className="text-gray-900">2 pregnancies, 2 live births</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Menstrual Period</p>
                  <p className="text-gray-900">Nov 1, 2025</p>
                </div>
                <div>
                  <p className="text-gray-500">Contraception</p>
                  <p className="text-gray-900">Oral contraceptives</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Click "Show Information" to view sensitive data</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mental Health Section
  if (activeSection === 'mental') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setActiveSection('overview')} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Mental Health History</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4" />
            <p>This information is private and protected</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <button
              onClick={() => setSensitiveVisible(!sensitiveVisible)}
              className="flex items-center gap-2 text-teal-600 mb-4"
            >
              {sensitiveVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{sensitiveVisible ? 'Hide' : 'Show'} Information</span>
            </button>

            {sensitiveVisible ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-gray-900 mb-2">Diagnoses</h3>
                  <div className="text-sm space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">Generalized Anxiety Disorder</p>
                      <p className="text-gray-500">Diagnosed: June 2020</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-900 mb-2">Current Management</h3>
                  <p className="text-sm text-gray-600">
                    Cognitive Behavioral Therapy (weekly sessions) + Sertraline 50mg daily
                  </p>
                </div>

                <div>
                  <h3 className="text-gray-900 mb-2">Crisis Plan</h3>
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-gray-900">Emergency Contact: Dr. Lisa Chen</p>
                    <p className="text-gray-600">(416) 555-7890</p>
                    <p className="text-gray-600 mt-2">Crisis Line: 1-866-531-2600</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Click "Show Information" to view sensitive data</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit History/Audit Log Section
  if (activeSection === 'audit') {
    const auditLog = [
      {
        id: '1',
        action: 'Updated Chronic Condition',
        field: 'Hypertension status',
        changedBy: 'Dr. Sarah Johnson',
        changedFrom: 'Active',
        changedTo: 'Active - Well Controlled',
        timestamp: 'Nov 15, 2025 at 2:30 PM',
      },
      {
        id: '2',
        action: 'Added Medication',
        field: 'Past Medications',
        changedBy: 'Sarah Johnson (Patient)',
        changedFrom: null,
        changedTo: 'Amoxicillin (Nov 1-10, 2025)',
        timestamp: 'Nov 10, 2025 at 4:15 PM',
      },
      {
        id: '3',
        action: 'Updated Social History',
        field: 'Smoking Status',
        changedBy: 'Dr. Sarah Johnson',
        changedFrom: 'Current smoker',
        changedTo: 'Former smoker',
        timestamp: 'Jan 15, 2018 at 10:00 AM',
      },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setActiveSection('overview')} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">Edit History</h1>
        </div>

        <div className="p-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-900">Audit Trail</p>
                <p className="text-blue-700">All changes to your medical history are tracked for accuracy and security.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {auditLog.map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-gray-900">{log.action}</h3>
                  <Badge className="bg-gray-100 text-gray-700 border-0">
                    {log.changedBy.includes('Patient') ? 'Patient' : 'Provider'}
                  </Badge>
                </div>

                <p className="text-sm text-gray-500 mb-3">{log.timestamp}</p>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Changed by</p>
                    <p className="text-gray-900">{log.changedBy}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Field</p>
                    <p className="text-gray-900">{log.field}</p>
                  </div>

                  {log.changedFrom && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-500">From</p>
                        <p className="text-gray-900">{log.changedFrom}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">To</p>
                        <p className="text-gray-900">{log.changedTo}</p>
                      </div>
                    </div>
                  )}

                  {!log.changedFrom && (
                    <div>
                      <p className="text-gray-500">Added</p>
                      <p className="text-gray-900">{log.changedTo}</p>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full mt-4 text-red-600 border-red-200 hover:bg-red-50">
                  Report Error
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
