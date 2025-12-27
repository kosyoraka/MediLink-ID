import { Mail } from 'lucide-react';
import { Button } from '../ui/button';

interface VerifyEmailProps {
  email: string;
  onVerified: () => void;
}

export default function VerifyEmail({ email, onVerified }: VerifyEmailProps) {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center">
      <div className="w-32 h-32 bg-teal-100 rounded-full flex items-center justify-center mb-6">
        <Mail className="w-16 h-16 text-teal-600" />
      </div>

      <h1 className="text-center mb-3 text-gray-900">Check your email</h1>
      
      <p className="text-center text-gray-600 mb-2">
        We've sent a verification link to:
      </p>
      
      <p className="text-center text-gray-900 mb-8">
        {email}
      </p>

      <p className="text-center text-gray-600 mb-6">
        Click the link in the email to verify your account and continue.
      </p>

      <Button onClick={onVerified} className="w-full max-w-sm bg-teal-600 hover:bg-teal-700 text-white h-12 mb-4">
        I've Verified My Email
      </Button>

      <button className="text-teal-600">
        Didn't get it? Resend
      </button>
    </div>
  );
}
