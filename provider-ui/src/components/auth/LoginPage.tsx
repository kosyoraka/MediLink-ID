import React, { useEffect, useState } from "react";
import { Activity, Eye, EyeOff } from "lucide-react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";

interface LoginPageProps {
  onLogin: () => void;
  onSignUpClick: () => void;
}

type StaffDTO = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  hospitalId: string;
  hospitalName: string;
  hospitalCity: string;
};

function readLastEmail(): string {
  try {
    const raw =
      localStorage.getItem("medilink_staff") ||
      sessionStorage.getItem("medilink_staff_session");
    if (!raw) return "";
    const staff = JSON.parse(raw) as Partial<StaffDTO>;
    return staff.email ? String(staff.email) : "";
  } catch {
    return "";
  }
}

export function LoginPage({ onLogin, onSignUpClick }: LoginPageProps) {
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const last = readLastEmail();
    if (last) setEmail(last);
  }, []);

  const storeAuth = (token: string, staff: StaffDTO) => {
    if (rememberMe) {
      localStorage.setItem("medilink_token", token);
      sessionStorage.removeItem("medilink_token");
      localStorage.setItem("medilink_staff", JSON.stringify(staff));
      sessionStorage.removeItem("medilink_staff_session");
    } else {
      sessionStorage.setItem("medilink_token", token);
      localStorage.removeItem("medilink_token");
      sessionStorage.setItem("medilink_staff_session", JSON.stringify(staff));
      localStorage.removeItem("medilink_staff");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiFetch<{
        token: string;
        staff: StaffDTO;
      }>("/api/staff/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: emailTrim, password }),
      });

      // 1) Store token first (so /api/staff/me has auth)
      // 2) Try to fetch the latest staff profile (fixes "blank provider info" issues)
      // If it fails, fallback to the staff object from signin.
      let staffToStore: StaffDTO = data.staff;

      try {
        const me = await apiFetch<StaffDTO>("/api/staff/me", { method: "GET" });
        // If backend returns a valid object, prefer it.
        if (me?.id) staffToStore = me;
      } catch {
        // ignore (we still have data.staff)
      }

      // 3) Store staff profile in same place the UI already reads
      storeAuth(data.token, staffToStore);

      toast.success("Login successful! Welcome back.");
      onLogin();
    } catch (err: any) {
      toast.error(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      toast.error("Google did not return a credential");
      return;
    }

    try {
      const data = await apiFetch<{
        token: string;
        staff: StaffDTO;
      }>("/api/staff/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });

      storeAuth(data.token, data.staff);
      toast.success("Google login successful");
      onLogin();
    } catch (err: any) {
      toast.error(err?.message || "Unable to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Medilink Portal</h1>
            <p className="text-gray-600 mt-1">Hospital Staff Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="staff@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pl-10 !pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {hasGoogleClientId ? (
            <div className="my-4 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google sign-in was cancelled or failed")}
                useOneTap={false}
                text="signin_with"
                shape="pill"
                theme="outline"
                size="large"
              />
            </div>
          ) : null}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onSignUpClick}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">© 2026 Medilink Hospital Management System</p>
      </div>
    </div>
  );
}
