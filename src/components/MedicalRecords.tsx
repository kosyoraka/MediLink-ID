import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  TestTube,
  FileText,
  Image,
  Stethoscope,
  ArrowLeft,
  Download,
  Share2,
  Upload,
  Pill,
  CreditCard,
  Folder,
  Building2,
  Clock3,
  CheckCircle2,
  Plus,
  FileUp,
  ExternalLink,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { api, type Provider, type RecordDocument, type RecordRequest } from "@/lib/api";

type DocumentCategory = "all" | "labs" | "imaging" | "visits" | "prescriptions" | "insurance" | "other";
type VerificationFilter = "all" | "verified" | "patient_uploaded";

const documentCategories = [
  { key: "all" as const, label: "All Records", icon: Folder, color: "bg-gray-100 text-gray-700" },
  { key: "labs" as const, label: "Labs", icon: TestTube, color: "bg-green-100 text-green-700" },
  { key: "imaging" as const, label: "Imaging", icon: Image, color: "bg-blue-100 text-blue-700" },
  { key: "visits" as const, label: "Visits", icon: Stethoscope, color: "bg-purple-100 text-purple-700" },
  { key: "prescriptions" as const, label: "Prescriptions", icon: Pill, color: "bg-orange-100 text-orange-700" },
  { key: "insurance" as const, label: "Insurance", icon: CreditCard, color: "bg-red-100 text-red-700" },
  { key: "other" as const, label: "Other", icon: FileText, color: "bg-slate-100 text-slate-700" },
];

const requestStatusLabel: Record<string, string> = {
  pending: "Pending",
  viewed: "Viewed",
  in_progress: "In progress",
  fulfilled: "Fulfilled",
  declined: "Declined",
  expired: "Expired",
};

const subtypeOptions: Record<Exclude<DocumentCategory, "all">, string[]> = {
  labs: ["CBC", "Lipid Panel", "Glucose / HbA1c", "Urine Test", "Hormone Panel", "Other"],
  imaging: ["X-ray", "MRI", "CT Scan", "Ultrasound", "Mammogram", "Other"],
  visits: ["Annual Physical", "Specialist Consult", "Discharge Summary", "Emergency Visit", "Follow-up Note", "Other"],
  prescriptions: ["Active Prescription", "Medication Plan", "Refill Authorization", "Medication History", "Other"],
  insurance: ["Insurance Card", "Claim Form", "Benefits Document", "Prior Authorization", "Other"],
  other: ["Other"],
};

function buildDocumentTitle(category: string, subtype: string, customSubtype: string) {
  const resolvedSubtype = subtype === "Other" ? customSubtype.trim() : subtype.trim();
  if (resolvedSubtype) return resolvedSubtype;

  const match = documentCategories.find((item) => item.key === category);
  return match?.label || "Medical Record";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 pr-8">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute"
          style={{ top: "-9999px", left: "-9999px" }}
        />
        {children}
      </div>
    </div>
  );
}

export default function MedicalRecords() {
  const [documents, setDocuments] = useState<RecordDocument[]>([]);
  const [requests, setRequests] = useState<RecordRequest[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>("all");
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>("all");
  const [selectedDocument, setSelectedDocument] = useState<RecordDocument | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadLinkMode, setUploadLinkMode] = useState<"personal" | "provider">("personal");
  const [uploadForm, setUploadForm] = useState({
    providerId: "",
    category: "labs",
    subtype: "CBC",
    customSubtype: "",
    description: "",
  });
  const [requestForm, setRequestForm] = useState({
    hospitalId: "",
    category: "labs",
    subtype: "CBC",
    customSubtype: "",
    message: "",
  });

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await api.listMyRecords({
        search,
        verification: verificationFilter,
      });

      setDocuments(docs.documents);
      setError("");

      const [recordRequests, connectedHospitals] = await Promise.allSettled([
        api.listMyRecordRequests(),
        api.listMyProviders(),
      ]);

      if (recordRequests.status === "fulfilled") {
        setRequests(recordRequests.value.requests);
      } else {
        setRequests([]);
        console.error("Failed to load record requests:", recordRequests.reason);
      }

      if (connectedHospitals.status === "fulfilled") {
        setProviders(connectedHospitals.value.providers);
      } else {
        setProviders([]);
        console.error("Failed to load connected providers:", connectedHospitals.reason);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [search, verificationFilter]);

  const filteredDocuments = useMemo(() => {
    if (activeCategory === "all") return documents;
    return documents.filter((doc) => doc.category === activeCategory);
  }, [documents, activeCategory]);

  const categoryCounts = useMemo(() => {
    return documentCategories.reduce<Record<string, number>>((acc, category) => {
      acc[category.key] =
        category.key === "all"
          ? documents.length
          : documents.filter((doc) => doc.category === category.key).length;
      return acc;
    }, {});
  }, [documents]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => ["pending", "viewed", "in_progress"].includes(request.status)).slice(0, 3),
    [requests]
  );

  const openDocument = async (documentId: string) => {
    const local = documents.find((doc) => doc.id === documentId);
    if (local) {
      setSelectedDocument(local);
      return;
    }

    try {
      const data = await api.getMyRecord(documentId);
      setSelectedDocument(data.document);
    } catch (e: any) {
      toast.error(e?.message || "Unable to open record");
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Choose a file to upload");
      return;
    }

    if (uploadForm.subtype === "Other" && !uploadForm.customSubtype.trim()) {
      toast.error("Enter the document type");
      return;
    }

    if (
      uploadLinkMode === "provider" &&
      uploadForm.category !== "insurance" &&
      !uploadForm.providerId
    ) {
      toast.error("Choose a connected provider");
      return;
    }

    setUploading(true);
    try {
      const fileDataUrl = await fileToDataUrl(uploadFile);
      const title = buildDocumentTitle(uploadForm.category, uploadForm.subtype, uploadForm.customSubtype);
      const created = await api.uploadMyRecord({
        hospitalId:
          uploadForm.category === "insurance" || uploadLinkMode === "personal"
            ? undefined
            : uploadForm.providerId || undefined,
        category: uploadForm.category,
        subtype:
          uploadForm.subtype === "Other"
            ? uploadForm.customSubtype.trim()
            : uploadForm.subtype.trim() || undefined,
        title,
        description: uploadForm.description.trim() || undefined,
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
        fileSizeBytes: uploadFile.size,
        fileDataUrl,
      });

      setDocuments((prev) => [created.document, ...prev]);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadLinkMode("personal");
      setUploadForm({
        providerId: "",
        category: "labs",
        subtype: "CBC",
        customSubtype: "",
        description: "",
      });
      toast.success("Document uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRequest = async () => {
    if (!requestForm.hospitalId || !requestForm.category) {
      toast.error("Choose a provider and record category");
      return;
    }

    if (requestForm.category === "insurance") {
      toast.error("Insurance documents should be uploaded by the patient");
      return;
    }

    if (requestForm.subtype === "Other" && !requestForm.customSubtype.trim()) {
      toast.error("Enter the document type");
      return;
    }

    setRequesting(true);
    try {
      const created = await api.createRecordRequest({
        hospitalId: requestForm.hospitalId,
        category: requestForm.category,
        subtype:
          requestForm.subtype === "Other"
            ? requestForm.customSubtype.trim()
            : requestForm.subtype.trim() || undefined,
        message: requestForm.message.trim() || undefined,
      });
      setRequests((prev) => [created.request, ...prev]);
      setRequestOpen(false);
      setRequestForm({
        hospitalId: "",
        category: "labs",
        subtype: "CBC",
        customSubtype: "",
        message: "",
      });
      toast.success("Record request sent");
    } catch (e: any) {
      toast.error(e?.message || "Unable to send request");
    } finally {
      setRequesting(false);
    }
  };

  const downloadDocument = (record: RecordDocument) => {
    const anchor = window.document.createElement("a");
    anchor.href = record.fileUrl;
    anchor.download = record.fileName;
    anchor.click();
  };

  const previewDocument = (document: RecordDocument) => {
    window.open(document.fileUrl, "_blank", "noopener,noreferrer");
  };

  const shareDocument = async (document: RecordDocument) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text: document.title });
      } else {
        await navigator.clipboard.writeText(document.title);
      }
      toast.success("Record ready to share");
    } catch {
      toast.error("Share was cancelled");
    }
  };

  if (selectedDocument) {
    const isImage = Boolean(selectedDocument.mimeType?.startsWith("image/"));
    const isPdf = selectedDocument.mimeType?.includes("pdf");

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSelectedDocument(null)} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-gray-900">Record Details</h2>
          <button className="text-teal-600" onClick={() => shareDocument(selectedDocument)}>
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-gray-900">{selectedDocument.title}</h1>
                <p className="text-sm text-gray-600 mt-1">{selectedDocument.sourceOrganizationName}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Badge className="bg-teal-100 text-teal-700 border-0">{selectedDocument.verificationLabel}</Badge>
                  <Badge variant="outline">{selectedDocument.category}</Badge>
                  {selectedDocument.subtype ? <Badge variant="outline">{selectedDocument.subtype}</Badge> : null}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadDocument(selectedDocument)}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => previewDocument(selectedDocument)}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Open
              </Button>
            </div>
            <div className="p-4">
              {isImage ? (
                <img src={selectedDocument.fileUrl} alt={selectedDocument.title} className="w-full rounded-lg border border-gray-200" />
              ) : isPdf ? (
                <iframe title={selectedDocument.title} src={selectedDocument.fileUrl} className="w-full h-[60vh] rounded-lg border border-gray-200" />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
                  <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-2">Preview not available for this file type.</p>
                  <Button variant="outline" onClick={() => previewDocument(selectedDocument)}>
                    Open File
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Source</p>
              <p className="text-gray-900">{selectedDocument.sourceOrganizationName}</p>
              <p className="text-sm text-gray-600 mt-1">Uploaded by {selectedDocument.uploadedBy}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Dates</p>
              <p className="text-sm text-gray-700">Service date: {formatDate(selectedDocument.serviceDate)}</p>
              <p className="text-sm text-gray-700 mt-1">Uploaded: {formatDate(selectedDocument.uploadDate)}</p>
            </div>
          </div>

          {selectedDocument.description ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-gray-700">{selectedDocument.description}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <h1 className="text-gray-900 mb-1">Records</h1>
        <p className="text-sm text-gray-600 mb-4">Your medical records from providers and personal uploads.</p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search records, sources, or document types..."
            className="pl-10 pr-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white flex-1" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setRequestOpen(true)}>
            Request Medical Record
          </Button>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-gray-500" />
                <h3 className="text-gray-900">Pending Requests</h3>
              </div>
              <span className="text-xs text-gray-500">{requests.length} total</span>
            </div>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-900">{request.hospitalName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {request.category}
                        {request.subtype ? ` • ${request.subtype}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{requestStatusLabel[request.status] || request.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "All Records" },
            { key: "verified", label: "Verified" },
            { key: "patient_uploaded", label: "Uploaded by You" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setVerificationFilter(filter.key as VerificationFilter)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap text-sm ${
                verificationFilter === filter.key ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {documentCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  activeCategory === category.key ? "border-teal-500 bg-teal-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${category.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm text-gray-900">{category.label}</p>
                <p className="text-xs text-gray-500">{categoryCounts[category.key] || 0} records</p>
              </button>
            );
          })}
        </div>

        {loading ? <div className="text-sm text-gray-600">Loading records…</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="flex items-center justify-between">
          <h3 className="text-gray-900">Records</h3>
          <span className="text-xs text-gray-500">{filteredDocuments.length} shown</span>
        </div>

        <div className="space-y-2">
          {filteredDocuments.map((doc) => {
            const categoryMeta =
              documentCategories.find((category) => category.key === doc.category) || documentCategories[0];
            const Icon = categoryMeta.icon;

            return (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryMeta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-gray-900 text-sm">{doc.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{doc.sourceOrganizationName}</p>
                      </div>
                      <Badge className="bg-teal-100 text-teal-700 border-0">{doc.verificationLabel}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
                      <span>{doc.subtype || doc.category}</span>
                      <span>•</span>
                      <span>{formatDate(doc.serviceDate || doc.uploadDate)}</span>
                      <span>•</span>
                      <span>{doc.fileSizeLabel}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openDocument(doc.id)}>
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => downloadDocument(doc)}>
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filteredDocuments.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-700">No records found</p>
            <p className="text-xs text-gray-500">Try another filter or add a new document.</p>
          </div>
        ) : null}
      </div>

      <ModalShell
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Document"
        description="Add a document to your records. You can attach it to a connected provider or keep it as a personal upload."
      >
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Linked provider</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                value={uploadForm.category === "insurance" ? "personal" : uploadLinkMode}
                disabled={uploadForm.category === "insurance"}
                onChange={(e) => {
                  const nextMode = e.target.value as "personal" | "provider";
                  setUploadLinkMode(nextMode);
                  if (nextMode === "personal") {
                    setUploadForm((prev) => ({ ...prev, providerId: "" }));
                  }
                }}
              >
                <option value="personal">Personal upload</option>
                <option value="provider">Connected provider</option>
              </select>
              {uploadForm.category === "insurance" ? (
                <p className="mt-1 text-xs text-gray-500">Insurance records are patient-uploaded only.</p>
              ) : null}
            </div>
            {uploadLinkMode === "provider" && uploadForm.category !== "insurance" ? (
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Choose connected provider</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                  value={uploadForm.providerId}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, providerId: e.target.value }))}
                >
                  <option value="">Select provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Category</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                  value={uploadForm.category}
                  onChange={(e) => {
                    const nextCategory = e.target.value as Exclude<DocumentCategory, "all">;
                    const nextSubtype = subtypeOptions[nextCategory][0];
                    setUploadForm((prev) => ({
                      ...prev,
                      category: nextCategory,
                      subtype: nextSubtype,
                      customSubtype: "",
                      hospitalId: nextCategory === "insurance" ? "" : prev.hospitalId,
                    }));
                  }}
                >
                  {documentCategories
                    .filter((category) => category.key !== "all")
                    .map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Document type</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                  value={uploadForm.subtype}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, subtype: e.target.value, customSubtype: "" }))}
                >
                  {subtypeOptions[uploadForm.category as Exclude<DocumentCategory, "all">].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {uploadForm.subtype === "Other" ? (
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Specify type</label>
              <Input
                value={uploadForm.customSubtype}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, customSubtype: e.target.value }))}
                placeholder="Enter document type"
              />
            </div>
            ) : null}
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Notes</label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Add context for this record"
              />
            </div>
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center">
              <FileUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="text-sm text-teal-700 cursor-pointer"
                onClick={() => uploadInputRef.current?.click()}
              >
                Choose file
              </button>
              <p className="text-xs text-gray-500 mt-2">
                {uploadFile ? `${uploadFile.name} • ${Math.round(uploadFile.size / 1024)} KB` : "PDF, JPG, PNG"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
      </ModalShell>

      <ModalShell
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request Medical Record"
        description="Ask a connected provider to upload a record into your MediLink history. You may be charged a reasonable fee by the provider for this service."
      >
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Provider</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                value={requestForm.hospitalId}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, hospitalId: e.target.value }))}
              >
                <option value="">Choose a provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Category</label>
                <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                value={requestForm.category}
                onChange={(e) => {
                  const nextCategory = e.target.value as Exclude<DocumentCategory, "all">;
                  const nextSubtype = subtypeOptions[nextCategory][0];
                  setRequestForm((prev) => ({
                    ...prev,
                    category: nextCategory,
                    subtype: nextSubtype,
                    customSubtype: "",
                  }));
                }}
              >
                  {documentCategories
                    .filter((category) => category.key !== "all" && category.key !== "insurance")
                    .map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Document type</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
                  value={requestForm.subtype}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, subtype: e.target.value, customSubtype: "" }))}
                >
                  {subtypeOptions[requestForm.category as Exclude<DocumentCategory, "all">].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {requestForm.subtype === "Other" ? (
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Specify type</label>
                <Input
                  value={requestForm.customSubtype}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, customSubtype: e.target.value }))}
                  placeholder="Enter document type"
                />
              </div>
            ) : null}
            <div>
              <label className="text-sm text-gray-700 mb-1 block">Message</label>
              <Textarea
                value={requestForm.message}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="What record do you need from this provider?"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleRequest} disabled={requesting}>
                {requesting ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </div>
      </ModalShell>
    </div>
  );
}
