import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface SignInProps {
  onSignIn: (userData: { email: string; name: string; healthCard: string; dob: string; connectedProviders: string[] }) => void;
  onRequireVerification: (email: string) => void;
  onForgotPassword: () => void;
  onBack: () => void;
  onGoToSignUp: () => void;
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function SignIn({ onSignIn, onRequireVerification, onForgotPassword, onBack, onGoToSignUp }: SignInProps) {
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) return;

    try {
      setFormError(null);

      const res = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
          localStorage.setItem('email', email);
          onRequireVerification(email);
          return;
        }
        throw new Error(data?.message || 'Sign in failed');
      }

      localStorage.setItem('patientId', data.id);
      localStorage.setItem('email', data.email);
      localStorage.setItem('patient_token', data.token);

      onSignIn({
        email: data.email,
        name: '',
        healthCard: '',
        dob: '',
        connectedProviders: [],
      });
    } catch (err: any) {
      setFormError(err?.message || 'Unable to sign in');
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
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Google sign-in failed");

      localStorage.setItem("patientId", data.id);
      localStorage.setItem("email", data.email);
      localStorage.setItem("patient_token", data.token);

      onSignIn({
        email: data.email,
        name: "",
        healthCard: "",
        dob: "",
        connectedProviders: [],
      });
    } catch (err: any) {
      setGoogleError(err?.message || "Unable to sign in with Google");
    }
  };



  return (
    <div className="min-h-screen p-6">
      <button onClick={onBack} className="mb-8 text-gray-600">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h1 className="mb-2 text-gray-900">Welcome Back</h1>
      <p className="text-gray-600 mb-8">Sign in to access your health records</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
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
              placeholder="Enter your password"
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
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <button
            type="button"
            className="text-sm text-teal-600 hover:text-teal-700"
            onClick={onForgotPassword}
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          disabled={!email || !password}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
        >
          Sign In
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={() => alert('Apple sign-in is coming soon')}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor"/>
            </svg>
            Sign in with Apple
          </Button>
          {hasGoogleClientId ? (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setGoogleError("Google sign-in was cancelled or failed")}
                useOneTap={false}
                text="signin_with"
                shape="pill"
                theme="outline"
                size="large"
              />
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full h-12" disabled>
              Google sign-in unavailable
            </Button>
          )}
          {googleError && (
            <p className="text-center text-sm text-red-600">{googleError}</p>
          )}
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              className="text-teal-600 hover:text-teal-700"
              onClick={onGoToSignUp}
            >
              Sign up
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
