import { useEffect, useMemo, useState } from "react";
import { Search, Filter, UserPlus, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AddPatientModal } from "@/components/modals/AddPatientModal";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Patient } from "@/lib/types";

interface PatientsProps {
  onNavigate: (page: string, data?: any) => void;
}

/**
 * Rows coming back from:
 *  - GET /api/staff/patients/connected (patients connected/disconnected to this hospital)
 */
type PatientListRow = {
  patient_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;

  // present for connected endpoint
  connected_at?: string;
  disconnected_at?: string | null;
  connection_status?: "Active" | "Inactive";
};

const calcAge = (dob: string | null) => {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const toPatientIdLabel = (uuid: string) => {
  const suffix = uuid.replace(/-/g, "").slice(-6).toUpperCase();
  return `PT-${suffix}`;
};

export function Patients({ onNavigate }: PatientsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "recent">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const placeholderPhotoBase =
    "https://ui-avatars.com/api/?background=2563eb&color=fff&name=";

  const handleAddPatient = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);

    apiFetch<PatientListRow[]>("/api/staff/patients/connected")
      .then((rows) => {
        if (!alive) return;

        const mapped: Patient[] = rows.map((r) => {
          const fullName =
            `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unnamed Patient";

          const status: "Active" | "Inactive" =
            r.connection_status ?? (r.disconnected_at ? "Inactive" : "Active");

          const lastVisit = r.connected_at ?? new Date().toISOString();

          return {
            id: r.patient_id,
            name: fullName,
            patientId: toPatientIdLabel(r.patient_id),
            photo: `${placeholderPhotoBase}${encodeURIComponent(fullName)}`,
            age: calcAge(r.dob),
            dateOfBirth: r.dob ?? "",
            lastVisit,
            status,
            phone: r.phone_number ?? "—",
            email: r.email,
            address: "—",
            insurance: "—",
            visitRecords: [],
            documents: [],
            emergencyInfo: {
              healthCardNumber: r.health_card ?? "—",
              allergies: [],
              bloodType: "—",
              medicalConditions: [],
              currentMedications: [],
              emergencyContacts: [],
              advanceDirectives: { dnrStatus: "—", livingWill: "—" },
              lastUpdated: new Date().toISOString(),
            },
          };
        });

        setPatients(mapped);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load patients");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patientId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "recent" &&
          new Date(patient.lastVisit) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
        (filterStatus === "active" && patient.status === "Active") ||
        (filterStatus === "inactive" && patient.status === "Inactive");

      return matchesSearch && matchesFilter;
    });
  }, [patients, searchQuery, filterStatus]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600 mt-1">
            Patients connected or previously connected to your hospital
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="w-4 h-4" />
          Add New Patient
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or patient ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="recent">Recently Added</option>
              </Select>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Active = patient is currently connected. Inactive = patient disconnected your hospital.
          </p>
        </CardContent>
      </Card>

      {loading && <div className="text-sm text-gray-600">Loading patients…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-sm text-gray-600">
        Showing {filteredPatients.length} of {patients.length} patients
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <img
                  src={patient.photo}
                  alt={patient.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-600">{patient.patientId}</p>
                    </div>
                    <Badge variant={patient.status === "Active" ? "success" : "secondary"}>
                      {patient.status}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age:</span>
                      <span className="font-medium text-gray-900">{patient.age} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">DOB:</span>
                      <span className="font-medium text-gray-900">
                        {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Connected:</span>
                      <span className="font-medium text-gray-900">
                        {patient.lastVisit ? formatDate(patient.lastVisit) : "—"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 gap-2"
                    onClick={() => onNavigate("patient-details", patient)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && filteredPatients.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No patients found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      )}

      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddPatient={handleAddPatient}
      />
    </div>
  );
}
