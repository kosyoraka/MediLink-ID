import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit,
  MessageSquare,
  Plus,
  FileText as FileTextIcon,
  Calendar,
  Download,
  Phone,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddVisitModal } from '@/components/modals/AddVisitModal';
import { toast } from '@/components/ui/toast';

import type { Patient, EmergencyContact } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

interface PatientDetailsProps {
  patient: Patient;
  onNavigate: (page: string, data?: any) => void;
}

type PatientProfileResponse = {
  patient_id: string;
  email: string;

  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;

  home_address_line1: string | null;
  home_address_line2: string | null;
  home_city: string | null;
  home_province: string | null;
  home_postal_code: string | null;

  mailing_same_as_home: boolean | null;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  mailing_city: string | null;
  mailing_province: string | null;
  mailing_postal_code: string | null;

  // emergency fields in patient_profiles
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  current_medications: string | null;
  dnr_status: string | null;
  living_will: string | null;
  emergency_contacts: any | null; // JSONB
  emergency_contact_full_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  created_at: string | null;
  
};

const calcAge = (dob: string | null) => {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const buildAddress = (p: PatientProfileResponse | null, fallback: string) => {
  if (!p) return fallback;

  const parts = [
    p.home_address_line1,
    p.home_address_line2,
    p.home_city,
    p.home_province,
    p.home_postal_code,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : fallback;
};

// Supports:
// - null
// - "Penicillin, Peanuts"
// - '["Penicillin","Peanuts"]' (stringified JSON array)
const parseStringList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);

  const s = String(value).trim();
  if (!s) return [];

  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // fall back
    }
  }

  return s.split(',').map((x) => x.trim()).filter(Boolean);
};

const parseEmergencyContacts = (value: unknown): EmergencyContact[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((c: any) => ({
        name: String(c?.name ?? '').trim(),
        relationship: String(c?.relationship ?? '').trim(),
        phone: String(c?.phone ?? '').trim(),
      }))
      .filter((c) => c.name || c.phone || c.relationship);
  }

  const s = String(value).trim();
  if (!s) return [];

  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed
        .map((c: any) => ({
          name: String(c?.name ?? '').trim(),
          relationship: String(c?.relationship ?? '').trim(),
          phone: String(c?.phone ?? '').trim(),
        }))
        .filter((c) => c.name || c.phone || c.relationship);
    }
  } catch {
    // ignore
  }

  return [];
};

export function PatientDetails({ patient, onNavigate }: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'documents' | 'appointments' | 'emergency'>('history');
  const [showAddVisitModal, setShowAddVisitModal] = useState(false);
  const [profile, setProfile] = useState<PatientProfileResponse | null>(null);

  useEffect(() => {
    let alive = true;

    apiFetch<PatientProfileResponse>(`/api/patients/${patient.id}/profile`)
      .then((data) => {
        if (!alive) return;
        setProfile(data);
      })
      .catch((e) => {
        console.error('Failed to load patient profile:', e);
        if (!alive) return;
        setProfile(null);
      });

    return () => {
      alive = false;
    };
  }, [patient.id]);

  const displayName = useMemo(() => {
    const n = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    return n || patient.name;
  }, [profile, patient.name]);

  const displayDob = useMemo(() => profile?.dob ?? patient.dateOfBirth, [profile, patient.dateOfBirth]);

  const displayAge = useMemo(() => {
    const fromDb = calcAge(profile?.dob ?? null);
    return fromDb || patient.age;
  }, [profile, patient.age]);

  const displayPhone = useMemo(() => profile?.phone_number ?? patient.phone, [profile, patient.phone]);
  const displayEmail = useMemo(() => profile?.email ?? patient.email, [profile, patient.email]);
  const displayHealthCard = useMemo(
    () => profile?.health_card ?? patient.emergencyInfo.healthCardNumber,
    [profile, patient.emergencyInfo.healthCardNumber]
  );

  const displayAddress = useMemo(() => buildAddress(profile, patient.address), [profile, patient.address]);

  const emergency = useMemo(() => {
  const emergencyContacts =
    profile?.emergency_contacts
      ? parseEmergencyContacts(profile.emergency_contacts)
      : (profile?.emergency_contact_full_name ||
         profile?.emergency_contact_phone ||
         profile?.emergency_contact_relationship)
        ? [
            {
              name: String(profile.emergency_contact_full_name ?? '').trim(),
              relationship: String(profile.emergency_contact_relationship ?? '').trim(),
              phone: String(profile.emergency_contact_phone ?? '').trim(),
            },
          ].filter((c) => c.name || c.phone || c.relationship)
        : (patient.emergencyInfo.emergencyContacts ?? []);

  return {
    bloodType: (profile?.blood_type ?? '').trim() || patient.emergencyInfo.bloodType || '—',
    allergies: profile?.allergies ? parseStringList(profile.allergies) : (patient.emergencyInfo.allergies ?? []),
    medicalConditions: profile?.medical_conditions
      ? parseStringList(profile.medical_conditions)
      : (patient.emergencyInfo.medicalConditions ?? []),
    currentMedications: profile?.current_medications
      ? parseStringList(profile.current_medications)
      : (patient.emergencyInfo.currentMedications ?? []),

    // ✅ use the computed fallback contacts
    emergencyContacts,

    advanceDirectives: {
      dnrStatus: (profile?.dnr_status ?? '').trim() || patient.emergencyInfo.advanceDirectives?.dnrStatus || '—',
      livingWill: (profile?.living_will ?? '').trim() || patient.emergencyInfo.advanceDirectives?.livingWill || '—',
    },
    lastUpdated: profile?.created_at || patient.emergencyInfo.lastUpdated || new Date().toISOString(),
  };
}, [profile, patient.emergencyInfo]);


  const tabs = [
    { id: 'history', label: 'Medical History' },
    { id: 'documents', label: 'Documents' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'emergency', label: 'Emergency Info' },
  ] as const;

  const getDocumentIcon = (_type: string) => FileTextIcon;

  const handleAddVisit = (_visitData: any) => {
    setTimeout(() => {
      toast.success('Visit record added successfully');
      setShowAddVisitModal(false);
    }, 500);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Button variant="ghost" onClick={() => onNavigate('patients')} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <img src={patient.photo} alt={displayName} className="w-24 h-24 rounded-full object-cover" />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                    <Badge variant={patient.status === 'Active' ? 'success' : 'secondary'}>{patient.status}</Badge>
                  </div>
                  <p className="text-gray-600 mt-1">{patient.patientId}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Patient
                  </Button>
                  <Button size="sm" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-medium text-gray-900 mt-1">{formatDate(displayDob)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Age</p>
                  <p className="font-medium text-gray-900 mt-1">{displayAge} years</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900 mt-1">{displayPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900 mt-1 truncate">{displayEmail}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900 mt-1">{displayAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Insurance</p>
                  <p className="font-medium text-gray-900 mt-1">{patient.insurance}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Visit History</h2>
            <Button onClick={() => setShowAddVisitModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Visit Record
            </Button>
          </div>

          <div className="space-y-4">
            {patient.visitRecords.map((visit) => (
              <Card key={visit.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{formatDate(visit.date)}</span>
                        {visit.followUpDate && (
                          <Badge variant="warning">Follow-up: {formatDate(visit.followUpDate)}</Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Diagnosis</p>
                          <p className="font-medium text-gray-900 mt-1">{visit.diagnosis}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Prescription</p>
                          <p className="text-gray-900 mt-1">{visit.prescription}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Doctor's Notes</p>
                          <p className="text-gray-900 mt-1">{visit.notes}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Attending Physician</p>
                          <p className="font-medium text-gray-900 mt-1">{visit.doctor}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {patient.visitRecords.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No visit records available yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Patient Documents</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Upload Document
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patient.documents.map((doc) => {
              const Icon = getDocumentIcon(doc.type);
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{doc.size}</p>
                        <Badge variant="secondary" className="mt-2">
                          {doc.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Uploaded: {formatDate(doc.uploadDate)}</p>
                      {doc.notes && <p className="text-xs text-gray-600 mb-3">{doc.notes}</p>}
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {patient.documents.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <FileTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Appointment History</h2>
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>View all appointments in the Appointments section</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Emergency Information</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900 mt-1">{displayName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-medium text-gray-900 mt-1">
                  {formatDate(displayDob)} ({displayAge} years old)
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Health Card Number</p>
                <p className="font-medium text-gray-900 mt-1">{displayHealthCard}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Allergies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {emergency.allergies.length > 0 ? (
                  emergency.allergies.map((allergy, index) => (
                    <Badge key={index} variant="error" className="px-3 py-1">
                      {allergy}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No allergies on file.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Blood Type</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{emergency.bloodType}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medical Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              {emergency.medicalConditions.length > 0 ? (
                <ul className="space-y-2">
                  {emergency.medicalConditions.map((condition, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-900">{condition}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No medical conditions on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {emergency.currentMedications.length > 0 ? (
                <ul className="space-y-2">
                  {emergency.currentMedications.map((medication, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-900">{medication}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No medications on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {emergency.emergencyContacts.length > 0 ? (
                emergency.emergencyContacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {contact.name} ({contact.relationship})
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{contact.phone}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Phone className="w-4 h-4" />
                      Call {contact.phone}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No emergency contacts on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advance Directives</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">DNR Status</p>
                <p className="font-medium text-gray-900 mt-1">{emergency.advanceDirectives.dnrStatus}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Living Will</p>
                <p className="font-medium text-gray-900 mt-1">{emergency.advanceDirectives.livingWill}</p>
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-gray-500 text-right">
            Last updated: {formatDateTime(emergency.lastUpdated)}
          </div>
        </div>
      )}

      {showAddVisitModal && (
        <AddVisitModal
          open={showAddVisitModal}
          onClose={() => setShowAddVisitModal(false)}
          onSubmit={handleAddVisit}
          patientName={displayName}
        />
      )}
    </div>
  );
}
