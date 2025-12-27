import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface SignInProps {
  onSignIn: (userData: { email: string; name: string; healthCard: string; dob: string; connectedProviders: string[] }) => void;
  onBack: () => void;
}

export default function SignIn({ onSignIn, onBack }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // For demo purposes, any sign-in will use John Doe's data with pre-connected providers
      // In production, this would authenticate against a real backend
      onSignIn({ 
        email: email,
        name: 'John Doe',
        healthCard: '1234-567-890',
        dob: '1985-06-15',
        connectedProviders: [
          'Sunnybrook Hospital',
          'Mount Sinai Hospital',
          'Toronto General Hospital',
          'Toronto Western Hospital',
          'LifeLabs',
          'Shoppers Drug Mart',
          'Dr. Sarah Johnson'
        ]
      });
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
          <button type="button" className="text-sm text-teal-600 hover:text-teal-700">
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
          <Button type="button" variant="outline" className="w-full h-12">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor"/>
            </svg>
            Sign in with Apple
          </Button>
          <Button type="button" variant="outline" className="w-full h-12">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </Button>
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button type="button" className="text-teal-600 hover:text-teal-700">
              Sign up
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}