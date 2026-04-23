import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { API_BASE } from '@/config/api';
import { EMAIL_VALIDATION_MESSAGE, isValidEmail, normalizeEmail } from '@/lib/authValidation';

interface VerifyEmailProps {
  email: string;
  status: 'pending' | 'verified' | 'expired' | 'invalid' | 'error';
  onBack: () => void;
  onContinue: () => void;
  onResendComplete: () => void;
}

export default function VerifyEmail({
  email,
  status,
  onBack,
  onContinue,
  onResendComplete,
}: VerifyEmailProps) {
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const view = useMemo(() => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle2,
          iconClass: 'text-green-600',
          iconWrapClass: 'bg-green-100',
          title: 'Email verified',
          body: 'Your account is verified. You can sign in now.',
        };
      case 'expired':
      case 'invalid':
      case 'error':
        return {
          icon: TriangleAlert,
          iconClass: 'text-amber-600',
          iconWrapClass: 'bg-amber-100',
          title: 'Link expired or invalid',
          body: 'Request a new verification email to continue.',
        };
      default:
        return {
          icon: Mail,
          iconClass: 'text-teal-600',
          iconWrapClass: 'bg-teal-100',
          title: 'Check your email',
          body: 'We sent you a verification link. Open the email to activate your account.',
        };
    }
  }, [status]);

  const handleResend = async () => {
    if (!email) {
      setError('We need your email address before we can resend the verification link.');
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError(EMAIL_VALIDATION_MESSAGE);
      return;
    }

    try {
      setResending(true);
      setError(null);
      setFeedback(null);

      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Unable to resend verification email');
      }

      setFeedback(data?.message || 'A fresh verification email has been sent.');
      onResendComplete();
    } catch (err: any) {
      setError(err?.message || 'Unable to resend verification email');
    } finally {
      setResending(false);
    }
  };

  const Icon = view.icon;

  return (
    <div className="min-h-screen p-6 flex flex-col">
      <button onClick={onBack} className="mb-8 text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${view.iconWrapClass}`}>
          <Icon className={`w-16 h-16 ${view.iconClass}`} />
        </div>

        <h1 className="text-center mb-3 text-gray-900">{view.title}</h1>
        {email && <p className="text-center text-gray-900 mb-3">{email}</p>}
        <p className="text-center text-gray-600 mb-8 max-w-md">{view.body}</p>

        {status === 'pending' && (
          <div className="w-full max-w-sm rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700 mb-4">
            If you do not see it, check spam or promotions.
          </div>
        )}

        {feedback && (
          <div className="w-full max-w-sm rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">
            {feedback}
          </div>
        )}

        {error && (
          <div className="w-full max-w-sm rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {status === 'verified' ? (
          <Button onClick={onContinue} className="w-full max-w-sm bg-teal-600 hover:bg-teal-700 text-white h-12 mb-4">
            Continue to Sign In
          </Button>
        ) : (
          <>
            <Button
              onClick={handleResend}
              disabled={resending}
              className="w-full max-w-sm bg-teal-600 hover:bg-teal-700 text-white h-12 mb-4"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>

            <p className="text-center text-sm text-gray-500 max-w-sm mb-4">
              Only the newest verification email will work.
            </p>
          </>
        )}

        {status !== 'verified' && (
          <button className="text-teal-600" onClick={onContinue}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
