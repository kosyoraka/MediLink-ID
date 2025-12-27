import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ProfileSetupProps {
  onNext: (firstName: string, lastName: string, healthCard: string, dob: string) => void;
  onBack: () => void;
}

export default function ProfileSetup({ onNext, onBack }: ProfileSetupProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [healthCard, setHealthCard] = useState('');
  const [phone, setPhone] = useState('');

  // Format health card number as XXXX-XXX-XXX
  const formatHealthCard = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limited = digitsOnly.slice(0, 10);
    
    // Format as XXXX-XXX-XXX
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)}-${limited.slice(4, 7)}-${limited.slice(7)}`;
    }
  };

  const handleHealthCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatHealthCard(e.target.value);
    setHealthCard(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Remove dashes before passing to parent
    const healthCardDigits = healthCard.replace(/\D/g, '');
    if (healthCardDigits.length === 10) {
      onNext(firstName, lastName, healthCard, dob);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
          <div className="h-2 flex-1 bg-gray-200 rounded-full" />
          <div className="h-2 flex-1 bg-gray-200 rounded-full" />
        </div>
        <p className="text-sm text-gray-600">Step 1 of 3</p>
      </div>

      <h1 className="mb-2 text-gray-900">Let's set up your profile</h1>
      <p className="text-gray-600 mb-2">This helps your healthcare providers identify you correctly.</p>
      <p className="text-sm text-gray-500 mb-8"><span className="text-red-500">*</span> Indicates a required field</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="dob" className="block text-gray-700 mb-2">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
            className="[&::-webkit-calendar-picker-indicator]:brightness-0"
          />
        </div>

        <div>
          <label htmlFor="healthCard" className="block text-gray-700 mb-2">
            Health Card Number (Ontario) <span className="text-red-500">*</span>
          </label>
          <Input
            id="healthCard"
            type="text"
            placeholder="1234-567-890"
            value={healthCard}
            onChange={handleHealthCardChange}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Required to connect with healthcare providers
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-gray-700 mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="(416) 555-0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12">
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}