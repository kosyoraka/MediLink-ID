import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, AlertCircle, Calendar, History, MessageCircle, MapPin, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import BodyDiagram from "./BodyDiagram";

interface SymptomCheckerProps {
  onBack: () => void;
  onNavigate?: (screen: "appointments" | "messages") => void;
}

type Step = "input" | "result";

type DurationOption = "Less than 1 day" | "1-3 days" | "4-7 days" | "Over a week";
type SeverityOption = "Mild" | "Moderate" | "Severe";

type GuidanceResult = {
  urgencyLevel: "Emergency" | "Urgent" | "Soon" | "Self-care";
  urgencyTitle: string;
  urgencyMessage: string;
  possibleCauses: Array<{
    name: string;
    likelihood: "Common" | "Possible" | "Less Likely";
    reasoning?: string;
  }>;
  selfCareTips: string[];
  redFlags: string[];
  nextSteps: string[];
  disclaimer: string;
};

type InquiryRecord = {
  id: string;
  createdAt: string;
  symptoms: string;
  selectedBody: string[];
  duration: DurationOption | "";
  severity: SeverityOption | "";
  result: GuidanceResult;
  followUps: Array<{
    id: string;
    createdAt: string;
    message: string;
    result: GuidanceResult;
  }>;
};

const HISTORY_STORAGE_KEY = "medilink_symptom_checker_history";

function loadStoredHistory(): InquiryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SymptomChecker({ onBack, onNavigate }: SymptomCheckerProps) {
  const [step, setStep] = useState<Step>("input");
  const [symptoms, setSymptoms] = useState("");
  const [selectedBody, setSelectedBody] = useState<string[]>([]);
  const [duration, setDuration] = useState<DurationOption | "">("");
  const [severity, setSeverity] = useState<SeverityOption | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuidanceResult | null>(null);
  const [history, setHistory] = useState<InquiryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const canSubmit =
    symptoms.trim().length > 0 &&
    selectedBody.length > 0 &&
    !!duration &&
    !!severity &&
    !loading;

  useEffect(() => {
    setHistory(loadStoredHistory());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const activeInquiry = useMemo(
    () => history.find((item) => item.id === activeInquiryId) || null,
    [history, activeInquiryId]
  );

  const getUrgencyStyle = (level: GuidanceResult["urgencyLevel"]) => {
    switch (level) {
      case "Emergency":
        return {
          wrap: "bg-red-50 border-red-200",
          icon: "text-red-600",
        };
      case "Urgent": 
        return {
          wrap: "bg-orange-50 border-orange-200",
          icon: "text-orange-600",
        };
      case "Soon":
        return {
          wrap: "bg-yellow-50 border-yellow-200",
          icon: "text-yellow-600",
        };
      default:
        return {
          wrap: "bg-teal-50 border-teal-200",
          icon: "text-teal-600",
        };
    }
  };

  async function handleGetGuidance() {
    setLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetch(`${API_BASE}/api/ai/symptom-guidance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyParts: selectedBody, // ✅ backend expects this key
          symptoms,
          duration,
          severity,
        }),
      });

      // backend sometimes returns text errors, sometimes json
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { result: GuidanceResult };
      if (!data?.result) throw new Error("Invalid response from AI service");

      setResult(data.result);
      const inquiryId = `${Date.now()}`;
      setActiveInquiryId(inquiryId);
      setHistory((current) => [
        {
          id: inquiryId,
          createdAt: new Date().toISOString(),
          symptoms: symptoms.trim(),
          selectedBody,
          duration,
          severity,
          result: data.result,
          followUps: [],
        },
        ...current,
      ]);
      setStep("result");
    } catch (e: any) {
      setError(e?.message || "AI guidance failed");
      setResult(null);
      setStep("input");
    } finally {
      setLoading(false);
    }
  }

  async function requestFollowUp() {
    if (!activeInquiry || !followUpPrompt.trim() || followUpLoading) return;

    setFollowUpLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetch(`${API_BASE}/api/ai/symptom-guidance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyParts: activeInquiry.selectedBody,
          symptoms: `${activeInquiry.symptoms}\n\nFollow-up question: ${followUpPrompt.trim()}`,
          duration: activeInquiry.duration,
          severity: activeInquiry.severity,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { result: GuidanceResult };
      if (!data?.result) throw new Error("Invalid response from AI service");

      const followUpEntry = {
        id: `${Date.now()}-followup`,
        createdAt: new Date().toISOString(),
        message: followUpPrompt.trim(),
        result: data.result,
      };

      setHistory((current) =>
        current.map((item) =>
          item.id === activeInquiry.id
            ? { ...item, followUps: [...item.followUps, followUpEntry] }
            : item
        )
      );
      setFollowUpPrompt("");
    } catch (e: any) {
      setError(e?.message || "Follow-up guidance failed");
    } finally {
      setFollowUpLoading(false);
    }
  }

  function openAppointments() {
    onNavigate?.("appointments");
  }

  function openMessages() {
    onNavigate?.("messages");
  }

  function openWalkInClinicSearch() {
    window.open(
      "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("walk-in clinic near me"),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openInquiryHistory(inquiryId?: string) {
    setActiveInquiryId(inquiryId || history[0]?.id || activeInquiryId || null);
    setShowHistory(true);
  }

  // ----------------------------
  // RESULT SCREEN
  // ----------------------------
  if (step === "result") {
    const urgencyLevel = result?.urgencyLevel || "Soon";
    const urgencyStyle = getUrgencyStyle(urgencyLevel);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStep("input");
                // keep result cached in case you want back/forth;
                // or clear it if you prefer:
                // setResult(null);
              }}
              className="text-gray-600"
              type="button"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-gray-900">Your Results</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Urgency Level */}
          <div className={`${urgencyStyle.wrap} border-2 rounded-xl p-5`}>
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className={`w-6 h-6 ${urgencyStyle.icon} flex-shrink-0`} />
              <div>
                <h3 className="text-gray-900 mb-1">
                  {result?.urgencyTitle || "Guidance"}
                </h3>
                <p className="text-sm text-gray-700">
                  {result?.urgencyMessage || "No message returned."}
                </p>
              </div>
            </div>
          </div>

          {/* Possible Causes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-gray-900 mb-3">Possible Causes</h3>

            <div className="space-y-3">
              {(result?.possibleCauses || []).slice(0, 5).map((cause, index) => {
                const badgeClass =
                  cause.likelihood === "Common"
                    ? "bg-blue-100 text-blue-700"
                    : cause.likelihood === "Possible"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-gray-100 text-gray-600";

                return (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900">{cause.name}</span>
                      <Badge className={`${badgeClass} border-0`}>{cause.likelihood}</Badge>
                    </div>
                    {cause.reasoning ? (
                      <p className="text-sm text-gray-600 mt-2">{cause.reasoning}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="text-gray-900">Important:</span>{" "}
                {result?.disclaimer ||
                  "This is not a diagnosis. Only a healthcare provider can diagnose your condition."}
              </p>
            </div>
          </div>

          {/* Self-Care Tips */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-gray-900 mb-3">Self-Care Tips</h3>
            <ul className="space-y-2">
              {(result?.selfCareTips || []).slice(0, 10).map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-teal-600 flex-shrink-0">•</span>
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* When to Seek Emergency Care */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-red-900 mb-3">Seek Emergency Care If:</h3>
            <ul className="space-y-2">
              {(result?.redFlags || []).slice(0, 10).map((flag, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-600 flex-shrink-0">•</span>
                  <span className="text-gray-700">{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          {!!result?.nextSteps?.length && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-gray-900 mb-3">Next Steps</h3>
              <ul className="space-y-2">
                {result.nextSteps.slice(0, 8).map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-600 flex-shrink-0">•</span>
                    <span className="text-gray-700">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
              type="button"
              onClick={openAppointments}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" className="w-full h-12" type="button" onClick={openMessages}>
              <MessageCircle className="w-5 h-5 mr-2" />
              Message Your Provider
            </Button>
            <Button variant="outline" className="w-full h-12" type="button" onClick={openWalkInClinicSearch}>
              <MapPin className="w-5 h-5 mr-2" />
              Find Nearest Walk-in Clinic
            </Button>
            <Button variant="outline" className="w-full h-12" type="button" onClick={() => openInquiryHistory(activeInquiryId || undefined)}>
              <History className="w-5 h-5 mr-2" />
              Continue Conversation
            </Button>
          </div>
        </div>

        {showConversation ? (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[85vh] overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <div>
                  <h3 className="text-gray-900">Continue Conversation</h3>
                  <p className="text-xs text-gray-500">Ask follow-up questions about this guidance.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConversation(false)}
                  className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[calc(85vh-72px)] overflow-y-auto p-4 space-y-4">
                {activeInquiry ? (
                  <>
                    <div className="rounded-2xl bg-gray-100 px-4 py-3 max-w-[85%]">
                      <p className="text-xs uppercase tracking-wide text-gray-500">You asked</p>
                      <p className="mt-1 text-sm text-gray-900">{activeInquiry.symptoms}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        Areas: {activeInquiry.selectedBody.join(", ")} • {activeInquiry.duration} • {activeInquiry.severity}
                      </p>
                    </div>

                    <div className="ml-auto rounded-2xl bg-teal-50 border border-teal-100 px-4 py-3 max-w-[90%]">
                      <p className="text-xs uppercase tracking-wide text-teal-700">MediLink AI</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">{activeInquiry.result.urgencyTitle}</p>
                      <p className="mt-2 text-sm text-gray-700">{activeInquiry.result.urgencyMessage}</p>
                    </div>

                    {activeInquiry.followUps.map((item) => (
                      <div key={item.id} className="space-y-3">
                        <div className="rounded-2xl bg-gray-100 px-4 py-3 max-w-[85%]">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Follow-up</p>
                          <p className="mt-1 text-sm text-gray-900">{item.message}</p>
                        </div>
                        <div className="ml-auto rounded-2xl bg-teal-50 border border-teal-100 px-4 py-3 max-w-[90%]">
                          <p className="text-xs uppercase tracking-wide text-teal-700">MediLink AI</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">{item.result.urgencyTitle}</p>
                          <p className="mt-2 text-sm text-gray-700">{item.result.urgencyMessage}</p>
                        </div>
                      </div>
                    ))}

                    <div className="rounded-xl border border-gray-200 p-4">
                      <Textarea
                        className="min-h-24"
                        placeholder="Ask a follow-up question about this guidance..."
                        value={followUpPrompt}
                        onChange={(e) => setFollowUpPrompt(e.target.value)}
                      />
                      <div className="mt-3 flex gap-2">
                        <Button type="button" className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={requestFollowUp} disabled={!followUpPrompt.trim() || followUpLoading}>
                          {followUpLoading ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                    Select a past inquiry to continue the conversation.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // ----------------------------
  // INPUT SCREEN
  // ----------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-600 to-red-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white" type="button">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Symptom Checker</h1>
        </div>
        <p className="text-orange-100">Get guidance on your symptoms</p>
      </div>

      <div className="p-6 -mt-4 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                <span className="text-gray-900">Not for emergencies.</span> If you&apos;re experiencing a medical
                emergency, call 911 or go to your nearest emergency room.
              </p>
            </div>
          </div>
        </div>

        {/* Body Map */}
        <BodyDiagram selectedParts={selectedBody} onPartSelect={setSelectedBody} />

        {/* Symptoms Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-3">Describe your symptoms</h3>
          <Textarea
            placeholder="E.g., I have a headache, runny nose, and feel tired..."
            className="min-h-32 mb-3"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
          <div className="text-sm text-gray-600 mb-3">
            <p className="mb-1">Tell us:</p>
            <ul className="space-y-1 ml-4">
              <li>• When did symptoms start?</li>
              <li>• How severe are they?</li>
              <li>• Any other symptoms?</li>
            </ul>
          </div>
        </div>

        {/* Duration */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-3">How long have you had these symptoms?</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["Less than 1 day", "1-3 days", "4-7 days", "Over a week"] as DurationOption[]).map((option) => {
              const selected = duration === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDuration(option)}
                  className={`p-3 border-2 rounded-lg transition-all text-sm ${
                    selected
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-3">How severe are your symptoms?</h3>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { label: "Mild", color: "border-yellow-200 hover:border-yellow-500 hover:bg-yellow-50" },
                { label: "Moderate", color: "border-orange-200 hover:border-orange-500 hover:bg-orange-50" },
                { label: "Severe", color: "border-red-200 hover:border-red-500 hover:bg-red-50" },
              ] as const
            ).map((s) => {
              const selected = severity === s.label;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSeverity(s.label)}
                  className={`p-3 border-2 rounded-lg transition-all ${
                    selected ? "border-teal-600 bg-teal-50" : s.color
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleGetGuidance}
            disabled={!canSubmit}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12"
            type="button"
          >
            {loading ? "Getting guidance..." : "Get Guidance"}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12"
            type="button"
            onClick={() => openInquiryHistory()}
          >
            <Search className="w-5 h-5 mr-2" />
            Past Inquiries
          </Button>
        </div>
      </div>

      {showHistory ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div>
                <h3 className="text-gray-900">Past Inquiries</h3>
                <p className="text-xs text-gray-500">Continue a previous AI guidance conversation.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(85vh-72px)] overflow-y-auto p-4">
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    No past inquiries yet. Ask for guidance first and it will appear here.
                  </div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveInquiryId(item.id);
                        setResult(item.result);
                        setStep("result");
                        setShowHistory(false);
                        setShowConversation(true);
                      }}
                      className="w-full rounded-xl border border-gray-200 p-4 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.symptoms}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()} • {item.severity}
                          </p>
                        </div>
                        <Badge className="border-0 bg-orange-100 text-orange-700">
                          {item.result.urgencyLevel}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
