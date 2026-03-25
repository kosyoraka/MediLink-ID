import { useEffect, useMemo, useState } from "react";
import { Filter, Upload, Download, FileText, File, Clock3, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UploadDocumentModal } from "@/components/modals/UploadDocumentModal";
import { apiFetch, type ProviderDocument, type ProviderDocumentRequest } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type PatientFilter = {
  patient_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

const categoryOptions = [
  { value: "all", label: "All Types" },
  { value: "labs", label: "Labs" },
  { value: "imaging", label: "Imaging" },
  { value: "visits", label: "Visits" },
  { value: "prescriptions", label: "Prescriptions" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

export function Documents() {
  const [filterType, setFilterType] = useState("all");
  const [filterPatient, setFilterPatient] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [patients, setPatients] = useState<PatientFilter[]>([]);
  const [requests, setRequests] = useState<ProviderDocumentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProviderDocumentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [documentData, patientRows, requestData] = await Promise.all([
        apiFetch<{ documents: ProviderDocument[] }>(
          `/api/staff/documents?${new URLSearchParams({
            ...(filterType !== "all" ? { category: filterType } : {}),
            ...(filterPatient !== "all" ? { patientId: filterPatient } : {}),
            ...(filterSource !== "all" ? { source: filterSource } : {}),
            ...(filterVerification !== "all" ? { verification: filterVerification } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
          }).toString()}`
        ),
        apiFetch<PatientFilter[]>("/api/staff/patients/connected"),
        apiFetch<{ requests: ProviderDocumentRequest[] }>("/api/staff/document-requests?status=pending"),
      ]);

      setDocuments(documentData.documents);
      setPatients(patientRows);
      setRequests(requestData.requests);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType, filterPatient, filterSource, filterVerification, search]);

  const pendingRequests = useMemo(() => requests, [requests]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "labs":
        return "success";
      case "prescriptions":
        return "warning";
      case "imaging":
        return "default";
      case "visits":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const openDocument = (doc: ProviderDocument) => {
    window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
  };

  const downloadDocument = (doc: ProviderDocument) => {
    const anchor = document.createElement("a");
    anchor.href = doc.fileUrl;
    anchor.download = doc.fileName;
    anchor.click();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">Manage patient documents, uploads, and incoming record requests.</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {pendingRequests.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock3 className="w-4 h-4 text-gray-500" />
              <h3 className="text-gray-900">Pending Record Requests</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p className="text-sm font-medium text-gray-900">{request.patientName}</p>
                  <p className="text-xs text-gray-600 mt-1">{request.category}{request.subtype ? ` • ${request.subtype}` : ""}</p>
                  {request.message ? <p className="text-xs text-gray-500 mt-2">{request.message}</p> : null}
                  <p className="text-xs text-gray-500 mt-2">{request.hospitalName}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowUploadModal(true);
                      }}
                    >
                      Fulfill Request
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
            >
              <option value="all">All Patients</option>
              {patients.map((patient) => (
                <option key={patient.patient_id} value={patient.patient_id}>
                  {`${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim() || patient.email}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="provider">Provider Uploaded</option>
              <option value="patient">Patient Uploaded</option>
            </select>

            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending Review</option>
              <option value="rejected">Rejected</option>
            </select>

            <Input
              placeholder="Search title, patient, subtype..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? <div className="text-sm text-gray-600">Loading documents…</div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="text-sm text-gray-600">Showing {documents.length} documents</div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{doc.title}</h3>
                  <p className="text-xs text-gray-600">{doc.fileSizeLabel}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={getTypeColor(doc.category)} className="text-xs">
                    {doc.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {doc.verificationLabel}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Patient</p>
                  <p className="text-sm font-medium text-gray-900">{doc.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Source</p>
                  <p className="text-sm text-gray-900">{doc.sourceOrganizationName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Service Date</p>
                  <p className="text-sm text-gray-900">{formatDate(doc.serviceDate || doc.uploadDate)}</p>
                </div>
                {doc.description ? (
                  <div>
                    <p className="text-xs text-gray-600">Notes</p>
                    <p className="text-xs text-gray-900 line-clamp-2">{doc.description}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => downloadDocument(doc)}>
                  <Download className="w-3 h-3" />
                  Download
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openDocument(doc)}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No documents found</p>
              <p className="text-sm mt-1">Try adjusting your filters or upload a new document.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showUploadModal ? (
        <UploadDocumentModal
          open={showUploadModal}
          initialRequest={selectedRequest}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedRequest(null);
          }}
          onUploaded={(document) => {
            setDocuments((prev) => [document, ...prev]);
            if (selectedRequest) {
              setRequests((prev) => prev.filter((request) => request.id !== selectedRequest.id));
              setSelectedRequest(null);
            }
            toast.success("Document added to patient record");
          }}
        />
      ) : null}
    </div>
  );
}
