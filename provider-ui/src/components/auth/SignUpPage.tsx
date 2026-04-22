import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Hospital,
  ArrowLeft,
  Check,
  Search,
  Mail,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";

interface SignUpPageProps {
  onSignUp: () => void;
  onBackToLogin: () => void;
}

type HospitalRow = {
  id: string; // UUID
  name: string;
  city: string; // "Toronto, ON"
};

type SignInResponse = {
  token: string;
  staff: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    hospitalId: string;
    hospitalName: string;
    hospitalCity: string;
  };
};

export function SignUpPage({ onSignUp, onBackToLogin }: SignUpPageProps) {
  // hospital → info → verify
  const [step, setStep] = useState<"provider" | "info" | "verify">("provider");
  const [isLoading, setIsLoading] = useState(false);

  // hospitals
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [isHospitalsLoading, setIsHospitalsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // verification
  const [staffId, setStaffId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState(""); // demo-only value returned by backend (for now)
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // password UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // form
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    phone: "",
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  // load hospitals from DB
  useEffect(() => {
    (async () => {
      try {
        const rows = await apiFetch<HospitalRow[]>("/api/hospitals");
        setHospitals(rows);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load hospitals");
      } finally {
        setIsHospitalsLoading(false);
      }
    })();
  }, []);

  const selectedHospital = useMemo(() => {
    if (!selectedHospitalId) return null;
    return hospitals.find((h) => h.id === selectedHospitalId) || null;
  }, [selectedHospitalId, hospitals]);

  const filteredHospitals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q)
    );
  }, [searchQuery, hospitals]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
  };

  const startResendTimer = () => {
    setTimeLeft(60);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const validateInfo = () => {
    if (!selectedHospital) {
      toast.error("Please select a hospital first");
      setStep("provider");
      return false;
    }

    const emailTrim = formData.email.trim();

    if (
      !formData.fullName.trim() ||
      !emailTrim ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.role.trim()
    ) {
      toast.error("Please fill in all required fields");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    // match backend rule (8 chars per your example)
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }

    return true;
  };

  const handleProviderContinue = () => {
    if (!selectedHospital) {
      toast.error("Please select a hospital first");
      return;
    }
    setStep("info");
  };

  // Step 2 submit => DB signup => returns staffId + demo code
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInfo()) return;

    setIsLoading(true);
    try {
      const res = await apiFetch<{
        staffId: string;
        email: string;
        verification: { code: string; expiresAt?: string };
      }>("/api/staff/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          hospitalId: selectedHospital!.id,
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role.trim(),
          phone: formData.phone.trim() || null,
        }),
      });

      setStaffId(res.staffId);
      setSentCode(res.verification?.code || "");
      setVerificationCode("");
      startResendTimer();

      toast.success(`Verification code sent to ${res.email || formData.email.trim()}`);
      setStep("verify");
    } catch (err: any) {
      toast.error(err?.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend is intentionally simple: you can add a real endpoint later
  const handleResendCode = () => {
    if (timeLeft > 0) {
      toast.error(`Please wait ${timeLeft} seconds before resending`);
      return;
    }
    toast.error("Resend code isn't wired yet. Next step: add /api/staff/auth/resend-code");
  };

  // Step 3 submit => verify => auto-login => store token/staff => onSignUp()
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffId) {
      toast.error("Missing signup context. Please restart signup.");
      setStep("provider");
      return;
    }

    if (!verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch("/api/staff/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ staffId, code: verificationCode }),
      });

      const login = await apiFetch<SignInResponse>("/api/staff/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      // persist for Header/Layout usage
      localStorage.setItem("medilink_token", login.token);
      localStorage.setItem("medilink_staff", JSON.stringify(login.staff));
      sessionStorage.removeItem("medilink_token");
      sessionStorage.removeItem("medilink_staff_session");

      toast.success("Account created and verified!");
      onSignUp();
    } catch (err: any) {
      toast.error(err?.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------ RENDER ------------------

  // STEP 1: PROVIDER (HOSPITAL)
  if (step === "provider") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="sm" onClick={onBackToLogin} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              <div className="flex-1 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Select Your Hospital</h1>
                <p className="text-gray-600 mt-1">Choose the hospital you work at</p>
              </div>

              <div className="w-20" />
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search hospital or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto mb-6 pr-2">
              {isHospitalsLoading ? (
                <div className="text-center py-12 text-gray-500">Loading hospitals...</div>
              ) : filteredHospitals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No hospitals found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredHospitals.map((h) => {
                    const isSelected = selectedHospitalId === h.id;
                    return (
                      <Card
                        key={h.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? "ring-2 ring-blue-600 shadow-md" : ""
                        }`}
                        onClick={() => setSelectedHospitalId(h.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Hospital className="w-6 h-6" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{h.name}</h3>
                              <p className="text-sm text-gray-600">{h.city}</p>
                            </div>

                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedHospital && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Selected Hospital:</strong> {selectedHospital.name}
                  <span className="block text-gray-500 mt-1">{selectedHospital.city}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onBackToLogin} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleProviderContinue} disabled={!selectedHospital} className="flex-1">
                Continue
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">© 2026 Medilink Hospital Management System</p>
        </div>
      </div>
    );
  }

  // STEP 2: INFO
  if (step === "info") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep("provider")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="w-20" />
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <Activity className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
              <p className="text-gray-600 mt-1">Join the Medilink Staff Portal</p>
            </div>

            {selectedHospital && (
              <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Hospital:</strong> {selectedHospital.name}
                  <span className="block text-gray-500 mt-1">{selectedHospital.city}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setStep("provider")}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Change hospital
                </button>
              </div>
            )}

            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Dr. John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@hospital.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  autoComplete="tel"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role/Position *
                </label>
                <Input
                  id="role"
                  type="text"
                  placeholder="e.g., Physician, Nurse, Administrator"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password *
                </label>

                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pl-10 !pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password *
                </label>

                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pl-10 !pr-12"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending code..." : "Continue to Email Verification"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">© 2026 Medilink Hospital Management System</p>
        </div>
      </div>
    );
  }

  // STEP 3: VERIFY
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => setStep("info")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="w-20" />
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verify Email</h1>
            <p className="text-gray-600 mt-1 text-center">We&apos;ve sent a 6-digit code to</p>
            <p className="text-blue-600 font-medium mt-1">{formData.email.trim()}</p>
          </div>

          {sentCode && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 text-center">
                <strong>Demo Code (for testing):</strong>
                <span className="block text-2xl font-bold mt-2 tracking-widest">{sentCode}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleVerificationSubmit} className="space-y-5">
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                Verification Code *
              </label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-semibold"
                required
                inputMode="numeric"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify & Create Account"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={timeLeft > 0}
                className={`text-sm font-medium flex items-center justify-center gap-2 mx-auto ${
                  timeLeft > 0 ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                {timeLeft > 0 ? `Resend code in ${timeLeft}s` : "Resend verification code"}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">© 2026 Medilink Hospital Management System</p>
      </div>
    </div>
  );
}
