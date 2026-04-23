import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { API_BASE } from "@/config/api";
import { getPatientDeviceId } from '@/lib/patientDevice';

interface SignUpProps {
  onBack: () => void;
  onGoToSignIn: () => void;
  onSignUp: (
    email: string,
    prefill?: { firstName?: string; lastName?: string }
  ) => void;
}

export default function SignUp({ onBack, onGoToSignIn, onSignUp }: SignUpProps) {
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [hospitalId, setHospitalId] = useState<string>("");


  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '' };
    if (pwd.length < 6) return { strength: 1, label: 'Weak' };
    if (pwd.length < 10) return { strength: 2, label: 'Medium' };
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd))
      return { strength: 3, label: 'Strong' };
    return { strength: 2, label: 'Medium' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !agreed) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          acceptedTerms: agreed,
          hospitalId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Signup failed (${res.status})`);
      }

      // ✅ store patientId for later
      localStorage.setItem('patientId', data.id);

      // optional but handy
      localStorage.setItem('email', data.email);

      // continue your existing app flow
      onSignUp(data.email);
    } catch (err: any) {
      setError(err?.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      setGoogleError("Google did not return a credential");
      return;
    }

    setGoogleError(null);

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credential,
          acceptedTerms: agreed,
          hospitalId: hospitalId || undefined,
          deviceId: getPatientDeviceId(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Google signup failed (${res.status})`);
      }

      localStorage.setItem("patientId", data.id);
      localStorage.setItem("email", data.email);
      localStorage.setItem("patient_token", data.token);

      onSignUp(data.email, {
        firstName: data.firstName || "",
        lastName: data.lastName || "",
      });
    } catch (err: any) {
      setGoogleError(err?.message ?? "Google signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <button onClick={onBack} className="mb-8 text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h1 className="mb-2 text-gray-900">Create Account</h1>
      <p className="text-gray-600 mb-8">Get started with MediLink ID</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-gray-700 mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                <div
                  className={`h-1 flex-1 rounded ${
                    passwordStrength.strength >= 1
                      ? passwordStrength.strength === 1
                        ? 'bg-red-500'
                        : passwordStrength.strength === 2
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    passwordStrength.strength >= 2
                      ? passwordStrength.strength === 2
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    passwordStrength.strength >= 3 ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              </div>
              <p
                className={`text-sm ${
                  passwordStrength.strength === 1
                    ? 'text-red-600'
                    : passwordStrength.strength === 2
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked) => {
              setAgreed(checked as boolean);
              setGoogleError(null);
            }}
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-gray-700">
            I agree to the{' '}
            <a href="#" className="text-teal-600 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-teal-600 underline">
              Privacy Policy
            </a>{' '}
            before creating my MediLink ID account.
          </label>
        </div>

        <div className="border-t border-b border-gray-200 py-6 space-y-4">
          <p className="text-gray-700">Or sign up with</p>
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              disabled={loading}
              onClick={() => alert('Apple sign-up is coming soon')}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                  fill="currentColor"
                />
              </svg>
              Sign up with Apple
            </Button>
            {hasGoogleClientId ? (
              <div className="flex justify-center">
                {agreed ? (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setGoogleError("Google sign-up was cancelled or failed")}
                    useOneTap={false}
                    text="signup_with"
                    shape="pill"
                    theme="outline"
                    size="large"
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-w-[220px] rounded-full text-gray-500"
                    disabled
                  >
                    Accept terms to use Google
                  </Button>
                )}
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full h-12" disabled={loading}>
                Google sign-up unavailable
              </Button>
            )}
            {googleError && (
              <p className="text-center text-sm text-red-600">{googleError}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={!email || !password || !agreed || loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
        >
          {loading ? 'Creating...' : 'Create Account'}
        </Button>

        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              className="text-teal-600 hover:text-teal-700"
              onClick={onGoToSignIn}
            >
              Sign in
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
