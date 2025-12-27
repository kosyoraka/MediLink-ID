import { Shield, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import logo from 'figma:asset/0e99e426ad6fec528013e68613d43f5c6919d2a0.png';

interface WelcomeLandingProps {
  onGetStarted: () => void;
  onSignIn?: () => void;
}

export default function WelcomeLanding({ onGetStarted, onSignIn }: WelcomeLandingProps) {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12">
        <div className="mb-8">
          <img src={logo} alt="MediLink ID Logo" className="h-16 w-auto" />
        </div>
        
        <div className="w-full max-w-sm mb-8">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80"
            alt="Person using NFC health card"
            className="w-full h-64 object-cover rounded-2xl shadow-lg"
          />
        </div>
        
        <h1 className="text-center mb-4 text-gray-900">
          Your health records. One place. Always with you.
        </h1>
        
        <p className="text-center text-gray-600 mb-8 px-4">
          Access your complete medical history, manage appointments, and share emergency information instantly.
        </p>
        
        <div className="w-full max-w-sm space-y-3">
          <Button onClick={onGetStarted} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12">
            Get Started
          </Button>
          <Button onClick={onSignIn} variant="outline" className="w-full h-12">
            Sign In
          </Button>
        </div>
      </div>
      
      <div className="px-6 pb-8">
        <div className="flex items-center justify-center gap-6 text-gray-600">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            <span className="text-sm">HL7 FHIR Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            <span className="text-sm">MediLink ID, 2025-2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}