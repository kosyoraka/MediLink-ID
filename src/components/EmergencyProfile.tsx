import { useState } from 'react';
import { ArrowLeft, AlertCircle, User, Droplet, AlertTriangle, Pill, Phone, FileText, Shield, Smartphone, Wallet } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Input } from './ui/input';

interface EmergencyProfileProps {
  onBack: () => void;
  userName?: string;
  userHealthCard?: string;
  userDOB?: string;
}

export default function EmergencyProfile({ onBack, userName, userHealthCard, userDOB }: EmergencyProfileProps) {
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [settings, setSettings] = useState({
    personalInfo: true,
    bloodType: true,
    allergies: true,
    conditions: true,
    medications: true,
    emergencyContacts: true,
    advanceDirectives: false,
  });

  // Format DOB to show full date and age
  const formatDOBWithAge = (dob: string) => {
    if (!dob) return "March 15, 1985 (39 years old)";
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Format date
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = birthDate.toLocaleDateString('en-US', options);
    
    return `${formattedDate} (${age} years old)`;
  };

  if (isEmergencyMode) {
    return (
      <div className="min-h-screen bg-red-600 text-white p-6">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setIsEmergencyMode(false)} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8" />
            <h1 className="text-white">EMERGENCY MODE</h1>
          </div>
          <div className="w-6" /> {/* Spacer for alignment */}
        </div>

        <div className="space-y-4">
          {/* Personal Information */}
          {settings.personalInfo && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
                <h2>Personal Information</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-gray-900">{userName || "Not provided"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="text-gray-900">{formatDOBWithAge(userDOB || '')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Health Card Number</p>
                  <p className="text-gray-900">{userHealthCard || "Not provided"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Critical Allergies */}
          {settings.allergies && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-red-600">ALLERGIES</h2>
              </div>
              <div className="space-y-2">
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-red-900">Penicillin (Severe - Anaphylaxis)</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-red-900">Shellfish (Moderate)</p>
                </div>
              </div>
            </div>
          )}

          {/* Blood Type */}
          {settings.bloodType && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Droplet className="w-6 h-6 text-blue-600" />
                </div>
                <h2>Blood Type</h2>
              </div>
              <p className="text-2xl">O Positive</p>
            </div>
          )}

          {/* Medical Conditions */}
          {settings.conditions && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <h2>Medical Conditions</h2>
              </div>
              <ul className="space-y-2">
                <li className="bg-gray-50 rounded-lg p-3">Type 2 Diabetes</li>
                <li className="bg-gray-50 rounded-lg p-3">Hypertension</li>
              </ul>
            </div>
          )}

          {/* Current Medications */}
          {settings.medications && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Pill className="w-6 h-6 text-green-600" />
                </div>
                <h2>Current Medications</h2>
              </div>
              <ul className="space-y-2">
                <li className="bg-gray-50 rounded-lg p-3">Lisinopril 10mg - Once daily</li>
                <li className="bg-gray-50 rounded-lg p-3">Metformin 500mg - Twice daily</li>
                <li className="bg-gray-50 rounded-lg p-3">Atorvastatin 20mg - Once daily</li>
              </ul>
            </div>
          )}

          {/* Emergency Contacts */}
          {settings.emergencyContacts && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-orange-600" />
                </div>
                <h2>Emergency Contacts</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 mb-1">John Doe (Spouse)</p>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call (416) 555-0123
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 mb-1">Jane Doe (Sister)</p>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call (416) 555-0456
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Advance Directives */}
          {settings.advanceDirectives && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h2>Advance Directives</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">DNR Status</p>
                  <p className="text-gray-900">Not Applicable</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Living Will</p>
                  <p className="text-gray-900">On file with primary physician</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-red-700 rounded-xl p-4">
          <p className="text-sm text-white">
            Last updated: Nov 18, 2025, 10:30 AM
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">Emergency Profile</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Test Emergency Mode */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-gray-900 mb-1">Test Emergency Mode</h3>
              <p className="text-sm text-gray-600">
                See what first responders will see when they access your emergency profile
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsEmergencyMode(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Preview Emergency View
          </Button>
        </div>

        {/* NFC Setup */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Smartphone className="w-6 h-6 text-teal-600 flex-shrink-0" />
            <div>
              <h3 className="text-gray-900 mb-1">How Emergency Access Works</h3>
              <p className="text-sm text-gray-600 mb-4">
                First responders can access your critical health information by tapping their device to yours
              </p>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Enable NFC on your phone (usually in Settings)</li>
                <li>Keep MediLink ID installed and emergency profile updated</li>
                <li>Information accessible even when phone is locked</li>
                <li>First responder taps their device to yours</li>
                <li>Your critical health info appears instantly</li>
              </ol>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            View Video Tutorial
          </Button>
        </div>

        {/* Add to Wallet */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Wallet className="w-6 h-6 text-teal-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-gray-900 mb-1">Quick Access from Lock Screen</h3>
              <p className="text-sm text-gray-600">
                Add your emergency profile to your digital wallet for instant access, even when your phone is locked
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button className="w-full bg-black hover:bg-gray-900 text-white h-12 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              <span>Add to Apple Wallet</span>
            </Button>
            
            <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-2 border-gray-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 5.778c0-.906.165-1.778.484-2.585l8.879 8.879-8.904 8.904c-.285-.753-.459-1.588-.459-2.476V5.778z" fill="#4285F4"/>
                <path d="M20.59 10.626c-.526-.254-1.156-.431-1.857-.431-.771 0-1.471.203-2.049.555l-2.158-2.157 8.904-8.904c.285.753.459 1.588.459 2.476v12.722c0 .906-.165 1.778-.484 2.585l-2.815-2.815v-4.031z" fill="#EA4335"/>
                <path d="M11.996 12.002L3.117 3.123C3.87 1.315 5.516 0 7.5 0c1.236 0 2.358.438 3.24 1.164l8.387 8.387-7.131 7.131-7.879-7.879c.254-.394.474-.824.649-1.287l5.23 5.486z" fill="#FBBC04"/>
                <path d="M11.996 12.002l7.131-7.131 2.158 2.157c.407.61.649 1.34.649 2.122 0 1.332-.652 2.514-1.656 3.246l-8.282 8.282-2.815-2.815 2.815-5.861z" fill="#34A853"/>
              </svg>
              <span>Add to Google Wallet</span>
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            Your emergency card will be accessible from your device's lock screen or wallet app
          </p>
        </div>

        {/* Emergency Information Settings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-gray-900">Information to Share</h3>
            <p className="text-sm text-gray-600">Choose what to display in emergency mode</p>
          </div>

          <div className="divide-y divide-gray-200">
            {[
              { key: 'personalInfo', icon: User, label: 'Personal Information', desc: 'Name, DOB, Health Card' },
              { key: 'bloodType', icon: Droplet, label: 'Blood Type', desc: 'For transfusions' },
              { key: 'allergies', icon: AlertTriangle, label: 'Allergies', desc: 'Drug and environmental' },
              { key: 'conditions', icon: FileText, label: 'Medical Conditions', desc: 'Chronic conditions' },
              { key: 'medications', icon: Pill, label: 'Current Medications', desc: 'All active prescriptions' },
              { key: 'emergencyContacts', icon: Phone, label: 'Emergency Contacts', desc: 'People to notify' },
              { key: 'advanceDirectives', icon: Shield, label: 'Advance Directives', desc: 'DNR status, living will' },
            ].map((item) => (
              <div key={item.key} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <Switch
                  checked={settings[item.key as keyof typeof settings]}
                  onCheckedChange={() => {
                    setSettings(prev => ({
                      ...prev,
                      [item.key]: !prev[item.key as keyof typeof settings]
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Edit Emergency Data */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-4">Update Emergency Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Blood Type</label>
              <select className="w-full p-3 border border-gray-300 rounded-lg">
                <option>O Positive</option>
                <option>O Negative</option>
                <option>A Positive</option>
                <option>A Negative</option>
                <option>B Positive</option>
                <option>B Negative</option>
                <option>AB Positive</option>
                <option>AB Negative</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Primary Emergency Contact</label>
              <Input placeholder="Full Name" className="mb-2" />
              <Input placeholder="Relationship" className="mb-2" />
              <Input placeholder="Phone Number" type="tel" />
            </div>

            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
              Save Changes
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="text-gray-900">Privacy & Security:</span> Emergency information is encrypted and only accessible when emergency mode is activated by you or authorized emergency services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}