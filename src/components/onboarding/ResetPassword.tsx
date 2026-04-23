import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { API_BASE } from '@/config/api';

interface ResetPasswordProps {
  token: string;
  onBack: () => void;
  onComplete: () => void;
}

export default function ResetPassword({ token, onBack, onComplete }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('This password reset link is missing or incomplete. Please request a fresh reset email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || 'Unable to reset password');
      }

      setMessage(data?.message || 'Your password has been updated.');
      setCompleted(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to reset password');
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
        <Lock className="w-12 h-12 text-teal-600" />
      </div>

      <h1 className="mb-2 text-gray-900">Choose a new password</h1>
      <p className="text-gray-600 mb-8">
        Create a new password for your account.
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

        {!completed ? (
          <>
            <div>
              <label htmlFor="new-password" className="block text-gray-700 mb-2">
                New password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">Use at least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-gray-700 mb-2">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={!token || !password || !confirmPassword || loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
            onClick={onComplete}
          >
            Continue to Sign In
          </Button>
        )}
      </form>
    </div>
  );
}
