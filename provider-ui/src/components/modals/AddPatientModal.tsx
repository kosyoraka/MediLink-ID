import { useMemo, useState } from "react";
import { X, User, Calendar, Mail, Phone, MapPin, FileText, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { Patient } from "@/lib/types";
import { apiFetch } from "@/lib/api";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient: (patient: Patient) => void;
}

type AddPatientResponse = {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  dob: string | null;
  phoneNumber: string | null;
  homeAddress: string | null;
  insurance: string | null;
  healthCard: string | null;
  bloodType: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  existingAccount: boolean;
  setupEmailSent: boolean;
};

export function AddPatientModal({ isOpen, onClose, onAddPatient }: AddPatientModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    address: "",
    insurance: "",
    healthCardNumber: "",
    bloodType: "",
    allergies: "",
    medicalConditions: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return !!formData.name.trim() && !!formData.dateOfBirth && !!formData.email.trim() && !!formData.phone.trim();
  }, [formData]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return Math.max(0, age);
  };

  const toPatientIdLabel = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const suffix = cleaned.slice(-6).padStart(6, "0");
    return `PT-${suffix}`;
  };

  const avatarUrl = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=2563eb&color=fff`;

  const resetForm = () => {
    setFormData({
      name: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      address: "",
      insurance: "",
      healthCardNumber: "",
      bloodType: "",
      allergies: "",
      medicalConditions: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name || !formData.dateOfBirth || !email || !formData.phone.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        email,
        fullName: name,
        dob: formData.dateOfBirth || null,
        phoneNumber: formData.phone.trim() || null,
        homeAddress: formData.address.trim() || null,
        insurance: formData.insurance.trim() || null,
        healthCard: formData.healthCardNumber.trim() || null,
        bloodType: formData.bloodType.trim() || null,
        allergies: formData.allergies.trim() || null,
        medicalConditions: formData.medicalConditions.trim() || null,
      };

      const created = await apiFetch<AddPatientResponse>("/api/staff/patients/intake", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const patient: Patient = {
        id: created.id,
        patientId: toPatientIdLabel(created.id),
        name,
        dateOfBirth: formData.dateOfBirth,
        age: calculateAge(formData.dateOfBirth),
        email,
        phone: formData.phone.trim(),
        address: created.homeAddress || formData.address.trim() || "Not provided",
        insurance: created.insurance || formData.insurance.trim() || "Not provided",
        photo: avatarUrl(name),
        status: "Active",
        lastVisit: new Date().toISOString(),
        visitRecords: [],
        documents: [],
        emergencyInfo: {
          healthCardNumber: created.healthCard || formData.healthCardNumber.trim() || "Not provided",
          allergies: formData.allergies
            ? formData.allergies.split(",").map((a) => a.trim()).filter(Boolean)
            : [],
          bloodType: created.bloodType || formData.bloodType.trim() || "Unknown",
          medicalConditions: formData.medicalConditions
            ? formData.medicalConditions.split(",").map((m) => m.trim()).filter(Boolean)
            : [],
          currentMedications: [],
          emergencyContacts: [],
          advanceDirectives: {
            dnrStatus: "Not Specified",
            livingWill: "Not on file",
          },
          lastUpdated: new Date().toISOString(),
        },
      };

      onAddPatient(patient);

      if (created.existingAccount) {
        toast.success("Patient account found and connected to your hospital.");
      } else if (created.setupEmailSent) {
        toast.success("Patient account created. A setup email was sent so they can create their password.");
      } else {
        toast.success("Patient account created, but the setup email could not be sent yet.");
      }

      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save patient intake");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Patient</h2>
            <p className="text-gray-600 mt-1">Create a patient account and send a password setup email</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                      className="pl-10"
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="john.doe@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-10"
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="pl-10"
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="123 Main Street, City, State ZIP"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="pl-10"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Insurance Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Insurance Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Provider</label>
                  <Input
                    type="text"
                    placeholder="Provider - Policy #"
                    value={formData.insurance}
                    onChange={(e) => handleInputChange("insurance", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Health Card Number</label>
                  <Input
                    type="text"
                    placeholder="1234-567-890"
                    value={formData.healthCardNumber}
                    onChange={(e) => handleInputChange("healthCardNumber", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-blue-600" />
                Medical Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Type</label>
                  <Input
                    type="text"
                    placeholder="A+"
                    value={formData.bloodType}
                    onChange={(e) => handleInputChange("bloodType", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Allergies</label>
                  <Input
                    type="text"
                    placeholder="Penicillin, Peanuts (comma separated)"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange("allergies", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Medical Conditions</label>
                <Input
                  type="text"
                  placeholder="Diabetes, Hypertension (comma separated)"
                  value={formData.medicalConditions}
                  onChange={(e) => handleInputChange("medicalConditions", e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSaving}>
              {isSaving ? "Saving..." : "Add Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
