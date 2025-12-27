import { useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Plus, Clock, Video, Building2, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type AppointmentTab = 'upcoming' | 'past';

interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  type: 'in-person' | 'virtual';
  status?: 'upcoming' | 'past';
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    doctor: 'Dr. Sarah Johnson',
    specialty: 'Family Medicine',
    date: 'Tomorrow, Nov 19',
    time: '2:30 PM',
    location: 'Sunnybrook Health Sciences Centre',
    type: 'in-person',
    status: 'upcoming',
  },
  {
    id: '2',
    doctor: 'Dr. Michael Chen',
    specialty: 'Cardiology',
    date: 'Nov 25, 2025',
    time: '10:00 AM',
    location: 'Virtual Appointment',
    type: 'virtual',
    status: 'upcoming',
  },
  {
    id: '3',
    doctor: 'Dr. Emily Wong',
    specialty: 'Dermatology',
    date: 'Dec 2, 2025',
    time: '3:15 PM',
    location: 'Mount Sinai Hospital',
    type: 'in-person',
    status: 'upcoming',
  },
  {
    id: '4',
    doctor: 'Dr. Sarah Johnson',
    specialty: 'Family Medicine',
    date: 'Nov 1, 2025',
    time: '2:00 PM',
    location: 'Sunnybrook Health Sciences Centre',
    type: 'in-person',
    status: 'past',
  },
  {
    id: '5',
    doctor: 'LifeLabs',
    specialty: 'Blood Work',
    date: 'Oct 15, 2025',
    time: '9:00 AM',
    location: 'LifeLabs - Toronto',
    type: 'in-person',
    status: 'past',
  },
];

export default function Appointments() {
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [showBooking, setShowBooking] = useState(false);

  const filteredAppointments = mockAppointments.filter(
    (apt) => apt.status === activeTab
  );

  if (showBooking) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-gray-900 mb-6">Book New Appointment</h1>
        
        <div className="space-y-3">
          {[
            { icon: Building2, label: 'Family Doctor', color: 'bg-blue-100 text-blue-600' },
            { icon: Building2, label: 'Specialist', color: 'bg-purple-100 text-purple-600' },
            { icon: Building2, label: 'Walk-in Clinic', color: 'bg-green-100 text-green-600' },
            { icon: Building2, label: 'Lab/Testing', color: 'bg-orange-100 text-orange-600' },
          ].map((type, index) => (
            <button
              key={index}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${type.color} flex items-center justify-center`}>
                  <type.icon className="w-6 h-6" />
                </div>
                <span className="text-gray-900">{type.label}</span>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowBooking(false)}
          className="w-full mt-6"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-900">Appointments</h1>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowBooking(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Book
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              activeTab === 'past'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {filteredAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-gray-900 mb-1">{appointment.doctor}</h3>
                <p className="text-sm text-gray-600 mb-2">{appointment.specialty}</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm">{appointment.date} at {appointment.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    {appointment.type === 'virtual' ? (
                      <>
                        <Video className="w-4 h-4" />
                        <span className="text-sm">{appointment.location}</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{appointment.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {appointment.type === 'virtual' && (
                <Badge className="bg-purple-100 text-purple-700 border-0">Virtual</Badge>
              )}
            </div>

            {activeTab === 'upcoming' ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  Directions
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  Add to Calendar
                </Button>
                <Button variant="outline" size="sm">
                  Reschedule
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full">
                View Visit Summary
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        ))}

        {filteredAppointments.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {activeTab} appointments</p>
          </div>
        )}
      </div>
    </div>
  );
}
