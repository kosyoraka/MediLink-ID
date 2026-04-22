export interface Patient {
  id: string;
  patientId: string;
  name: string;
  dateOfBirth: string;
  age: number;
  email: string;
  phone: string;
  address: string;
  insurance: string;
  photo: string;
  status: "Active" | "Inactive";
  lastVisit: string;
  visitRecords: VisitRecord[];
  documents: Document[];
  emergencyInfo: EmergencyInfo;
}

export interface EmergencyInfo {
  healthCardNumber: string;
  allergies: string[];
  bloodType: string;
  medicalConditions: string[];
  currentMedications: string[];
  emergencyContacts: EmergencyContact[];
  advanceDirectives: {
    dnrStatus: string;
    livingWill: string;
  };
  lastUpdated: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface VisitRecord {
  id: string;
  date: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  followUpDate?: string;
  doctor: string;
}

export type AppointmentType =
  | "Consultation"
  | "Follow-up"
  | "Lab Test"
  | "Surgery"
  | "Checkup";

export type AppointmentStatus =
  | "Scheduled"
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhoto: string | null;
  startTime: string;
  type: string;
  appointmentType?: string;
  visitMode?: string;
  providerName?: string | null;
  hospitalName?: string | null;
  durationMinutes?: number | null;
  status: string;
  notes: string;
}



export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isStaff: boolean;
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  patientPhoto: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface Document {
  id: string;
  name: string;
  type: "Lab Result" | "Prescription" | "Scan" | "Report" | "Other";
  patientId: string;
  patientName: string;
  uploadDate: string;
  size: string;
  url: string;
  notes?: string;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface StaffMember {
  name: string;
  email: string;
  phone: string;
  role: string;
  photo: string;
}
