import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { API_BASE } from '@/config/api';

interface ForgotPasswordProps {
  initialEmail?: string;
  onBack: () => void;
  onComplete: (email: string) => void;
}

export default function ForgotPassword({ initialEmail = '', onBack, onComplete }: ForgotPasswordProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Unable to send password reset email');
      }

      setMessage(data?.message || 'If an account exists, a reset email has been sent.');
      onComplete(email);
    } catch (err: any) {
      setError(err?.message || 'Unable to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <button onClick={onBack} className="mb-8 text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6">
        <Mail className="w-12 h-12 text-teal-600" />
      </div>

      <h1 className="mb-2 text-gray-900">Reset your password</h1>
      <p className="text-gray-600 mb-8">
        Enter your email address and we will send you a secure link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
        {message && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="forgot-email" className="block text-gray-700 mb-2">
            Email
          </label>
          <Input
            id="forgot-email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={!email || loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>
    </div>
  );
}
