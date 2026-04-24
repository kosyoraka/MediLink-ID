import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { apiFetch, type ProviderDocument, type ProviderDocumentRequest } from "@/lib/api";

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (document: ProviderDocument) => void;
  initialRequest?: ProviderDocumentRequest | null;
  initialPatient?: {
    id: string;
    name: string;
  } | null;
}

type PatientOption = {
  id: string;
  name: string;
  patientId: string;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function UploadDocumentModal({
  open,
  onClose,
  onUploaded,
  initialRequest = null,
  initialPatient = null,
}: UploadDocumentModalProps) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [requests, setRequests] = useState<ProviderDocumentRequest[]>([]);
  const [formData, setFormData] = useState({
    patientId: "",
    category: "labs",
    subtype: "",
    title: "",
    serviceDate: new Date().toISOString().split("T")[0],
    sourceOrganizationName: "",
    notes: "",
    requestId: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const [patientRows, requestRows] = await Promise.all([
          apiFetch<Array<any>>("/api/staff/patients/connected"),
          apiFetch<{ requests: ProviderDocumentRequest[] }>("/api/staff/document-requests?status=pending"),
        ]);

        setPatients(
          patientRows.map((row) => ({
            id: String(row.patient_id),
            name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.email || "Patient",
            patientId: String(row.patient_id),
          }))
        );
        setRequests(requestRows.requests || []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load upload options");
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (initialRequest) {
      setFormData((prev) => ({
        ...prev,
        requestId: initialRequest.id,
        patientId: initialRequest.patientId,
        category: initialRequest.category,
        subtype: initialRequest.subtype || "",
        title: initialRequest.subtype || `${initialRequest.category} record`,
      }));
      return;
    }

    setFormData({
      patientId: initialPatient?.id ?? "",
      category: "labs",
      subtype: "",
      title: "",
      serviceDate: new Date().toISOString().split("T")[0],
      sourceOrganizationName: "",
      notes: "",
      requestId: "",
    });
    setFile(null);
  }, [open, initialRequest, initialPatient?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.category || !formData.title.trim() || !file) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);
    try {
      const fileDataUrl = await fileToDataUrl(file);
      const created = await apiFetch<{ document: ProviderDocument }>("/api/staff/documents/upload", {
        method: "POST",
        body: JSON.stringify({
          patientId: formData.patientId,
          category: formData.category,
          subtype: formData.subtype.trim() || undefined,
          title: formData.title.trim(),
          description: formData.notes.trim() || undefined,
          sourceOrganizationName: formData.sourceOrganizationName.trim() || undefined,
          serviceDate: formData.serviceDate || undefined,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          fileDataUrl,
          requestId: formData.requestId || undefined,
        }),
      });

      toast.success("Document uploaded successfully");
      onUploaded(created.document);
      onClose();
      setFile(null);
      setFormData({
        patientId: "",
        category: "labs",
        subtype: "",
        title: "",
        serviceDate: new Date().toISOString().split("T")[0],
        sourceOrganizationName: "",
        notes: "",
        requestId: "",
      });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {initialRequest ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-medium text-gray-900">{initialRequest.patientName}</p>
              <p className="text-xs text-gray-600 mt-1">
                Fulfilling request for {initialRequest.category}
                {initialRequest.subtype ? ` • ${initialRequest.subtype}` : ""}
              </p>
              {initialRequest.message ? (
                <p className="text-xs text-gray-600 mt-2">{initialRequest.message}</p>
              ) : null}
            </div>
          ) : null}

          {requests.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fulfill request</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                value={formData.requestId}
                disabled={Boolean(initialRequest)}
                onChange={(e) => {
                  const nextRequest = requests.find((request) => request.id === e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    requestId: e.target.value,
                    patientId: nextRequest?.patientId || prev.patientId,
                    category: nextRequest?.category || prev.category,
                    subtype: nextRequest?.subtype || prev.subtype,
                    title: prev.title || `${nextRequest?.category || "Document"} upload`,
                  }));
                }}
              >
                <option value="">None</option>
                {requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.patientName} • {request.hospitalName} • {request.category}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Patient *</label>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
              value={formData.patientId}
              disabled={Boolean(initialRequest || initialPatient)}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              required
            >
              <option value="">Choose a patient...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
            {initialPatient ? (
              <p className="mt-1 text-xs text-gray-500">Uploading for {initialPatient.name}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                value={formData.category}
                disabled={Boolean(initialRequest)}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="labs">Labs</option>
                <option value="imaging">Imaging</option>
                <option value="visits">Visits</option>
                <option value="prescriptions">Prescriptions</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtype</label>
              <Input
                value={formData.subtype}
                disabled={Boolean(initialRequest)}
                onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                placeholder="e.g. CBC, MRI, discharge summary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Document title"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Date</label>
              <Input
                type="date"
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Source Organization</label>
              <Input
                value={formData.sourceOrganizationName}
                onChange={(e) => setFormData({ ...formData, sourceOrganizationName: e.target.value })}
                placeholder="Optional override"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload File *</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-blue-600 bg-blue-50" : "border-gray-300"
              }`}
            >
              {file ? (
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{Math.round(file.size / 1024)} KB</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFile(null)} className="mt-3">
                    Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-2">Drag and drop your file here, or</p>
                  <label className="cursor-pointer text-blue-600 hover:underline">
                    browse files
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Supported formats: PDF, JPG, PNG</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes / Description</label>
            <Textarea
              placeholder="Add any additional notes about this document"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
