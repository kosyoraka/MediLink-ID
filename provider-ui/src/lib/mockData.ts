import { Patient, Appointment, Conversation, Document, Activity, StaffMember } from './types';

export const staffMember: StaffMember = {
  name: 'Dr. Sarah Johnson',
  email: 'staff@hospital.com',
  phone: '+1 (555) 123-4567',
  role: 'Senior Physician',
  photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop'
};

export const patients: Patient[] = [
  {
    id: '1',
    patientId: 'PT-001234',
    name: 'John Anderson',
    dateOfBirth: '1985-03-15',
    age: 40,
    email: 'john.anderson@email.com',
    phone: '+1 (555) 234-5678',
    address: '123 Main Street, New York, NY 10001',
    insurance: 'Blue Cross Blue Shield - Policy #BC123456',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    status: 'Active',
    lastVisit: '2026-01-10',
    visitRecords: [
      {
        id: 'v1',
        date: '2026-01-10',
        diagnosis: 'Hypertension - Stage 1',
        prescription: 'Lisinopril 10mg once daily, follow low-sodium diet',
        notes: 'Blood pressure 145/92. Patient responding well to medication. Schedule follow-up in 3 months.',
        followUpDate: '2026-04-10',
        doctor: 'Dr. Sarah Johnson'
      },
      {
        id: 'v2',
        date: '2025-10-15',
        diagnosis: 'Annual Physical Examination',
        prescription: 'Vitamin D supplement 2000 IU daily',
        notes: 'Overall good health. Cholesterol slightly elevated. Recommended dietary changes.',
        doctor: 'Dr. Sarah Johnson'
      },
      {
        id: 'v3',
        date: '2025-07-22',
        diagnosis: 'Upper Respiratory Infection',
        prescription: 'Amoxicillin 500mg three times daily for 7 days',
        notes: 'Patient presented with cough and congestion. No fever. Rest and hydration advised.',
        doctor: 'Dr. Michael Chen'
      }
    ],
    documents: [
      {
        id: 'd1',
        name: 'Blood Work Results - Jan 2026',
        type: 'Lab Result',
        patientId: 'PT-001234',
        patientName: 'John Anderson',
        uploadDate: '2026-01-10',
        size: '245 KB',
        url: '#',
        notes: 'Complete metabolic panel and lipid panel'
      },
      {
        id: 'd2',
        name: 'Prescription - Lisinopril',
        type: 'Prescription',
        patientId: 'PT-001234',
        patientName: 'John Anderson',
        uploadDate: '2026-01-10',
        size: '120 KB',
        url: '#'
      },
      {
        id: 'd3',
        name: 'Chest X-Ray Report',
        type: 'Scan',
        patientId: 'PT-001234',
        patientName: 'John Anderson',
        uploadDate: '2025-07-22',
        size: '1.2 MB',
        url: '#',
        notes: 'Clear lung fields, no abnormalities detected'
      }
    ],
    emergencyInfo: {
      healthCardNumber: '1234567001',
      allergies: ['Penicillin', 'Peanuts'],
      bloodType: 'A+',
      medicalConditions: ['Hypertension'],
      currentMedications: ['Lisinopril 10mg', 'Vitamin D 2000 IU'],
      emergencyContacts: [
        {
          name: 'Mary Anderson',
          relationship: 'Spouse',
          phone: '+1 (555) 234-5679'
        },
        {
          name: 'James Anderson',
          relationship: 'Brother',
          phone: '+1 (555) 234-5680'
        }
      ],
      advanceDirectives: {
        dnrStatus: 'No DNR',
        livingWill: 'On file'
      },
      lastUpdated: '2026-01-10T14:30:00'
    }
  },
  {
    id: '2',
    patientId: 'PT-001567',
    name: 'Emily Rodriguez',
    dateOfBirth: '1992-07-28',
    age: 33,
    email: 'emily.rodriguez@email.com',
    phone: '+1 (555) 345-6789',
    address: '456 Oak Avenue, Brooklyn, NY 11201',
    insurance: 'Aetna - Policy #AE789012',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    status: 'Active',
    lastVisit: '2026-01-12',
    visitRecords: [
      {
        id: 'v4',
        date: '2026-01-12',
        diagnosis: 'Migraine - Chronic',
        prescription: 'Sumatriptan 50mg as needed for acute attacks, Propranolol 40mg daily for prevention',
        notes: 'Patient reports 3-4 migraines per month. Discussed trigger identification and lifestyle modifications.',
        followUpDate: '2026-02-12',
        doctor: 'Dr. Sarah Johnson'
      },
      {
        id: 'v5',
        date: '2025-11-20',
        diagnosis: 'Allergic Rhinitis',
        prescription: 'Fluticasone nasal spray daily, Cetirizine 10mg as needed',
        notes: 'Seasonal allergies. Patient doing well with current regimen.',
        doctor: 'Dr. Sarah Johnson'
      }
    ],
    documents: [
      {
        id: 'd4',
        name: 'MRI Brain Scan',
        type: 'Scan',
        patientId: 'PT-001567',
        patientName: 'Emily Rodriguez',
        uploadDate: '2025-09-15',
        size: '3.4 MB',
        url: '#',
        notes: 'Normal brain MRI, no structural abnormalities'
      },
      {
        id: 'd5',
        name: 'Migraine Medication Plan',
        type: 'Prescription',
        patientId: 'PT-001567',
        patientName: 'Emily Rodriguez',
        uploadDate: '2026-01-12',
        size: '180 KB',
        url: '#'
      }
    ],
    emergencyInfo: {
      healthCardNumber: '1234567002',
      allergies: ['Dust', 'Shellfish'],
      bloodType: 'B+',
      medicalConditions: ['Chronic Migraine', 'Allergic Rhinitis'],
      currentMedications: ['Sumatriptan 50mg', 'Propranolol 40mg', 'Fluticasone nasal spray'],
      emergencyContacts: [
        {
          name: 'Carlos Rodriguez',
          relationship: 'Father',
          phone: '+1 (555) 345-6790'
        }
      ],
      advanceDirectives: {
        dnrStatus: 'N/A',
        livingWill: 'N/A'
      },
      lastUpdated: '2026-01-12T10:15:00'
    }
  },
  {
    id: '3',
    patientId: 'PT-002145',
    name: 'Michael Thompson',
    dateOfBirth: '1978-11-03',
    age: 47,
    email: 'michael.thompson@email.com',
    phone: '+1 (555) 456-7890',
    address: '789 Elm Street, Queens, NY 11375',
    insurance: 'UnitedHealthcare - Policy #UH345678',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    status: 'Active',
    lastVisit: '2026-01-08',
    visitRecords: [
      {
        id: 'v6',
        date: '2026-01-08',
        diagnosis: 'Type 2 Diabetes Mellitus - Well Controlled',
        prescription: 'Metformin 1000mg twice daily, continue current insulin regimen',
        notes: 'HbA1c at 6.8%, good glycemic control. Patient adhering to diet and exercise plan.',
        followUpDate: '2026-04-08',
        doctor: 'Dr. Sarah Johnson'
      },
      {
        id: 'v7',
        date: '2025-12-01',
        diagnosis: 'Diabetic Foot Examination',
        prescription: 'Continue current medications',
        notes: 'No signs of neuropathy or circulation issues. Emphasized importance of daily foot care.',
        doctor: 'Dr. Lisa Park'
      }
    ],
    documents: [
      {
        id: 'd6',
        name: 'HbA1c Test Results',
        type: 'Lab Result',
        patientId: 'PT-002145',
        patientName: 'Michael Thompson',
        uploadDate: '2026-01-08',
        size: '156 KB',
        url: '#'
      },
      {
        id: 'd7',
        name: 'Diabetes Management Plan',
        type: 'Report',
        patientId: 'PT-002145',
        patientName: 'Michael Thompson',
        uploadDate: '2026-01-08',
        size: '425 KB',
        url: '#',
        notes: 'Comprehensive diabetes care plan with dietary guidelines'
      }
    ],
    emergencyInfo: {
      healthCardNumber: '1234567003',
      allergies: ['Sulfa drugs'],
      bloodType: 'O+',
      medicalConditions: ['Type 2 Diabetes Mellitus'],
      currentMedications: ['Metformin 1000mg', 'Insulin (as directed)'],
      emergencyContacts: [
        {
          name: 'Linda Thompson',
          relationship: 'Spouse',
          phone: '+1 (555) 456-7891'
        },
        {
          name: 'David Thompson',
          relationship: 'Son',
          phone: '+1 (555) 456-7892'
        }
      ],
      advanceDirectives: {
        dnrStatus: 'No DNR',
        livingWill: 'On file'
      },
      lastUpdated: '2026-01-08T16:45:00'
    }
  },
  {
    id: '4',
    patientId: 'PT-002389',
    name: 'Sarah Martinez',
    dateOfBirth: '2001-05-19',
    age: 24,
    email: 'sarah.martinez@email.com',
    phone: '+1 (555) 567-8901',
    address: '321 Pine Road, Manhattan, NY 10016',
    insurance: 'Cigna - Policy #CG901234',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    status: 'Active',
    lastVisit: '2026-01-13',
    visitRecords: [
      {
        id: 'v8',
        date: '2026-01-13',
        diagnosis: 'Anxiety Disorder - Generalized',
        prescription: 'Sertraline 50mg daily, referred to mental health counseling',
        notes: 'Patient reports increased anxiety affecting daily life. Discussed coping strategies and therapy options.',
        followUpDate: '2026-02-13',
        doctor: 'Dr. Sarah Johnson'
      }
    ],
    documents: [
      {
        id: 'd8',
        name: 'Mental Health Assessment',
        type: 'Report',
        patientId: 'PT-002389',
        patientName: 'Sarah Martinez',
        uploadDate: '2026-01-13',
        size: '298 KB',
        url: '#'
      }
    ],
    emergencyInfo: {
      healthCardNumber: '1234567004',
      allergies: ['None known'],
      bloodType: 'AB+',
      medicalConditions: ['Generalized Anxiety Disorder'],
      currentMedications: ['Sertraline 50mg'],
      emergencyContacts: [
        {
          name: 'Maria Martinez',
          relationship: 'Mother',
          phone: '+1 (555) 567-8902'
        },
        {
          name: 'Alex Martinez',
          relationship: 'Brother',
          phone: '+1 (555) 567-8903'
        }
      ],
      advanceDirectives: {
        dnrStatus: 'N/A',
        livingWill: 'N/A'
      },
      lastUpdated: '2026-01-13T11:20:00'
    }
  },
  {
    id: '5',
    patientId: 'PT-003012',
    name: 'Robert Chen',
    dateOfBirth: '1965-09-12',
    age: 60,
    email: 'robert.chen@email.com',
    phone: '+1 (555) 678-9012',
    address: '654 Maple Drive, Bronx, NY 10451',
    insurance: 'Medicare - Policy #MC567890',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    status: 'Active',
    lastVisit: '2026-01-09',
    visitRecords: [
      {
        id: 'v9',
        date: '2026-01-09',
        diagnosis: 'Osteoarthritis - Bilateral Knees',
        prescription: 'Celecoxib 200mg daily, physical therapy referral',
        notes: 'Patient experiencing moderate pain with activity. Discussed joint preservation strategies and weight management.',
        followUpDate: '2026-03-09',
        doctor: 'Dr. Sarah Johnson'
      },
      {
        id: 'v10',
        date: '2025-10-20',
        diagnosis: 'Annual Medicare Wellness Visit',
        prescription: 'Continue current medications',
        notes: 'Comprehensive health assessment completed. Updated advanced directives on file.',
        doctor: 'Dr. Sarah Johnson'
      }
    ],
    documents: [
      {
        id: 'd9',
        name: 'Knee X-Ray - Bilateral',
        type: 'Scan',
        patientId: 'PT-003012',
        patientName: 'Robert Chen',
        uploadDate: '2025-12-15',
        size: '2.1 MB',
        url: '#',
        notes: 'Moderate joint space narrowing, compatible with osteoarthritis'
      },
      {
        id: 'd10',
        name: 'Physical Therapy Orders',
        type: 'Prescription',
        patientId: 'PT-003012',
        patientName: 'Robert Chen',
        uploadDate: '2026-01-09',
        size: '145 KB',
        url: '#'
      }
    ],
    emergencyInfo: {
      healthCardNumber: '1234567005',
      allergies: ['Aspirin'],
      bloodType: 'A-',
      medicalConditions: ['Osteoarthritis'],
      currentMedications: ['Celecoxib 200mg'],
      emergencyContacts: [
        {
          name: 'Mei Chen',
          relationship: 'Spouse',
          phone: '+1 (555) 678-9013'
        },
        {
          name: 'Kevin Chen',
          relationship: 'Son',
          phone: '+1 (555) 678-9014'
        }
      ],
      advanceDirectives: {
        dnrStatus: 'DNR on file',
        livingWill: 'On file'
      },
      lastUpdated: '2025-10-20T09:30:00'
    }
  },
  {
    id: '6',
    patientId: 'PT-003156',
    name: 'Jennifer Williams',
    dateOfBirth: '1988-02-25',
    age: 37,
    email: 'jennifer.williams@email.com',
    phone: '+1 (555) 789-0123',
    address: '987 Cedar Lane, Staten Island, NY 10301',
    insurance: 'Humana - Policy #HU234567',
    photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    status: 'Active',
    lastVisit: '2026-01-11',
    visitRecords: [
      {
        id: 'v11',
        date: '2026-01-11',
        diagnosis: 'Prenatal Care - 24 weeks gestation',
        prescription: 'Prenatal vitamins, iron supplement',
        notes: 'Fetal development progressing normally. Patient feeling well. Next ultrasound scheduled.',
        followUpDate: '2026-02-08',
        doctor: 'Dr. Sarah Johnson'
      }
    ],
    documents: [
      {
        id: 'd11',
        name: 'Ultrasound - 20 Week Anatomy Scan',
        type: 'Scan',
        patientId: 'PT-003156',
        patientName: 'Jennifer Williams',
        uploadDate: '2025-12-28',
        size: '1.8 MB',
        url: '#',
        notes: 'Normal fetal anatomy, no abnormalities detected'
      },
      {
        id: 'd12',
        name: 'Prenatal Lab Panel',
        type: 'Lab Result',
        patientId: 'PT-003156',
        patientName: 'Jennifer Williams',
        uploadDate: '2026-01-11',
        size: '234 KB',
        url: '#'
      }
    ],
    emergencyInfo: {
      healthCardNumber: '1234567006',
      allergies: ['Latex'],
      bloodType: 'O-',
      medicalConditions: ['Pregnancy - 24 weeks gestation'],
      currentMedications: ['Prenatal vitamins', 'Iron supplement'],
      emergencyContacts: [
        {
          name: 'Michael Williams',
          relationship: 'Spouse',
          phone: '+1 (555) 789-0124'
        },
        {
          name: 'Patricia Williams',
          relationship: 'Mother',
          phone: '+1 (555) 789-0125'
        }
      ],
      advanceDirectives: {
        dnrStatus: 'N/A',
        livingWill: 'N/A'
      },
      lastUpdated: '2026-01-11T13:45:00'
    }
  }
];

export const appointments: Appointment[] = [
  {
    id: 'a1',
    patientId: 'PT-001234',
    patientName: 'John Anderson',
    patientPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    date: '2026-01-14',
    time: '09:00 AM',
    type: 'Follow-up',
    status: 'Confirmed',
    notes: 'Blood pressure check and medication review'
  },
  {
    id: 'a2',
    patientId: 'PT-001567',
    patientName: 'Emily Rodriguez',
    patientPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    date: '2026-01-14',
    time: '10:30 AM',
    type: 'Consultation',
    status: 'Confirmed',
    notes: 'Migraine consultation - discuss new treatment options'
  },
  {
    id: 'a3',
    patientId: 'PT-002389',
    patientName: 'Sarah Martinez',
    patientPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    date: '2026-01-14',
    time: '02:00 PM',
    type: 'Follow-up',
    status: 'Pending',
    notes: 'Anxiety medication follow-up'
  },
  {
    id: 'a4',
    patientId: 'PT-003156',
    patientName: 'Jennifer Williams',
    patientPhoto: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    date: '2026-01-15',
    time: '11:00 AM',
    type: 'Checkup',
    status: 'Confirmed',
    notes: 'Prenatal checkup - 25 weeks'
  },
  {
    id: 'a5',
    patientId: 'PT-002145',
    patientName: 'Michael Thompson',
    patientPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    date: '2026-01-15',
    time: '03:30 PM',
    type: 'Lab Test',
    status: 'Confirmed',
    notes: 'Quarterly diabetes lab work - HbA1c and lipid panel'
  },
  {
    id: 'a6',
    patientId: 'PT-003012',
    patientName: 'Robert Chen',
    patientPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    date: '2026-01-16',
    time: '10:00 AM',
    type: 'Follow-up',
    status: 'Pending',
    notes: 'Post-physical therapy evaluation'
  },
  {
    id: 'a7',
    patientId: 'PT-001234',
    patientName: 'John Anderson',
    patientPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    date: '2026-01-10',
    time: '02:00 PM',
    type: 'Consultation',
    status: 'Completed',
    notes: 'Hypertension evaluation'
  },
  {
    id: 'a8',
    patientId: 'PT-001567',
    patientName: 'Emily Rodriguez',
    patientPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    date: '2026-01-08',
    time: '09:30 AM',
    type: 'Consultation',
    status: 'Completed',
    notes: 'Migraine consultation'
  },
  {
    id: 'a9',
    patientId: 'PT-002389',
    patientName: 'Sarah Martinez',
    patientPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    date: '2026-01-05',
    time: '01:00 PM',
    type: 'Consultation',
    status: 'Cancelled',
    notes: 'Patient requested reschedule'
  },
  {
    id: 'a10',
    patientId: 'PT-003012',
    patientName: 'Robert Chen',
    patientPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    date: '2026-01-17',
    time: '02:30 PM',
    type: 'Consultation',
    status: 'Pending',
    notes: 'Orthopedic consultation for knee pain management'
  }
];

export const conversations: Conversation[] = [
  {
    id: 'c1',
    patientId: 'PT-001567',
    patientName: 'Emily Rodriguez',
    patientPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    lastMessage: 'Thank you, Doctor! I will try that.',
    lastMessageTime: '2026-01-14T08:30:00',
    unreadCount: 0,
    messages: [
      {
        id: 'm1',
        senderId: 'PT-001567',
        senderName: 'Emily Rodriguez',
        content: 'Hi Dr. Johnson, I had another migraine yesterday. Should I adjust my medication?',
        timestamp: '2026-01-14T08:15:00',
        isStaff: false
      },
      {
        id: 'm2',
        senderId: 'staff',
        senderName: 'Dr. Sarah Johnson',
        content: 'Hello Emily! How many times this week have you taken the Sumatriptan?',
        timestamp: '2026-01-14T08:20:00',
        isStaff: true
      },
      {
        id: 'm3',
        senderId: 'PT-001567',
        senderName: 'Emily Rodriguez',
        content: 'Three times this week. They seem to be getting more frequent.',
        timestamp: '2026-01-14T08:22:00',
        isStaff: false
      },
      {
        id: 'm4',
        senderId: 'staff',
        senderName: 'Dr. Sarah Johnson',
        content: 'Let\'s discuss this at your appointment tomorrow. In the meantime, try to identify any triggers (stress, certain foods, lack of sleep) and keep a log.',
        timestamp: '2026-01-14T08:25:00',
        isStaff: true
      },
      {
        id: 'm5',
        senderId: 'PT-001567',
        senderName: 'Emily Rodriguez',
        content: 'Thank you, Doctor! I will try that.',
        timestamp: '2026-01-14T08:30:00',
        isStaff: false
      }
    ]
  },
  {
    id: 'c2',
    patientId: 'PT-001234',
    patientName: 'John Anderson',
    patientPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    lastMessage: 'Can I get a copy of my recent lab results?',
    lastMessageTime: '2026-01-13T16:45:00',
    unreadCount: 1,
    messages: [
      {
        id: 'm6',
        senderId: 'PT-001234',
        senderName: 'John Anderson',
        content: 'Hello Dr. Johnson, I hope you\'re doing well.',
        timestamp: '2026-01-13T16:40:00',
        isStaff: false
      },
      {
        id: 'm7',
        senderId: 'PT-001234',
        senderName: 'John Anderson',
        content: 'Can I get a copy of my recent lab results?',
        timestamp: '2026-01-13T16:45:00',
        isStaff: false
      }
    ]
  },
  {
    id: 'c3',
    patientId: 'PT-003156',
    patientName: 'Jennifer Williams',
    patientPhoto: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    lastMessage: 'Perfect! Thank you so much.',
    lastMessageTime: '2026-01-13T14:20:00',
    unreadCount: 0,
    messages: [
      {
        id: 'm8',
        senderId: 'PT-003156',
        senderName: 'Jennifer Williams',
        content: 'Hi Dr. Johnson! I wanted to confirm my appointment for next week.',
        timestamp: '2026-01-13T14:10:00',
        isStaff: false
      },
      {
        id: 'm9',
        senderId: 'staff',
        senderName: 'Dr. Sarah Johnson',
        content: 'Hello Jennifer! Yes, you\'re scheduled for Wednesday, January 15th at 11:00 AM for your 25-week prenatal checkup.',
        timestamp: '2026-01-13T14:15:00',
        isStaff: true
      },
      {
        id: 'm10',
        senderId: 'PT-003156',
        senderName: 'Jennifer Williams',
        content: 'Perfect! Thank you so much.',
        timestamp: '2026-01-13T14:20:00',
        isStaff: false
      }
    ]
  },
  {
    id: 'c4',
    patientId: 'PT-002145',
    patientName: 'Michael Thompson',
    patientPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    lastMessage: 'My blood sugar has been running a bit high in the mornings.',
    lastMessageTime: '2026-01-13T10:30:00',
    unreadCount: 2,
    messages: [
      {
        id: 'm11',
        senderId: 'PT-002145',
        senderName: 'Michael Thompson',
        content: 'Good morning Dr. Johnson,',
        timestamp: '2026-01-13T10:25:00',
        isStaff: false
      },
      {
        id: 'm12',
        senderId: 'PT-002145',
        senderName: 'Michael Thompson',
        content: 'My blood sugar has been running a bit high in the mornings.',
        timestamp: '2026-01-13T10:30:00',
        isStaff: false
      }
    ]
  }
];

export const recentActivities: Activity[] = [
  {
    id: 'act1',
    type: 'appointment',
    description: 'Completed appointment with Sarah Martinez',
    timestamp: '2026-01-13T15:30:00',
    icon: 'calendar-check'
  },
  {
    id: 'act2',
    type: 'document',
    description: 'Uploaded lab results for John Anderson',
    timestamp: '2026-01-13T14:15:00',
    icon: 'file-text'
  },
  {
    id: 'act3',
    type: 'patient',
    description: 'Added new patient: Jennifer Williams',
    timestamp: '2026-01-13T11:20:00',
    icon: 'user-plus'
  },
  {
    id: 'act4',
    type: 'message',
    description: 'Responded to message from Emily Rodriguez',
    timestamp: '2026-01-13T09:45:00',
    icon: 'message-square'
  },
  {
    id: 'act5',
    type: 'appointment',
    description: 'Scheduled follow-up for Robert Chen',
    timestamp: '2026-01-13T08:30:00',
    icon: 'calendar'
  }
];