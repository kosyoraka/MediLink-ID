import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, Mail, Shield, Smartphone, Video } from "lucide-react";
import { api, type PatientSecurityEvent, type PatientSigninSession } from "@/lib/api";
import { getPatientDeviceId } from "@/lib/patientDevice";
import { Button } from "./ui/button";

export type SettingsPage =
  | "privacy-settings"
  | "session-management"
  | "faqs"
  | "contact-support"
  | "tutorial-videos"
  | "about"
  | "app-version"
  | "privacy-policy"
  | "terms-of-service";

type Props = {
  page: SettingsPage;
  onBack: () => void;
  onNavigate?: (screen: string) => void;
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function Shell({ title, subtitle, onBack, children }: { title: string; subtitle?: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white p-4">
        <button type="button" onClick={onBack} className="rounded-full p-2 hover:bg-gray-100" aria-label="Back">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-gray-900">{title}</h1>
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4">{children}</div>;
}

function EventLabel({ event }: { event: PatientSecurityEvent }) {
  const labels: Record<string, string> = {
    signin_first_trusted_device: "First trusted device sign-in",
    signin_new_device: "New device sign-in",
    password_changed: "Password changed",
  };
  return <span>{labels[event.event_type] || event.event_type.replaceAll("_", " ")}</span>;
}

function PrivacySettings({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Awaited<ReturnType<typeof api.getPatientSecurityOverview>>["account"] | null>(null);
  const [events, setEvents] = useState<PatientSecurityEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getPatientSecurityOverview()
      .then((data) => {
        if (cancelled) return;
        setAccount(data.account);
        setEvents(data.events || []);
      })
      .catch(() => {
        if (!cancelled) {
          setAccount(null);
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell title="Privacy Settings" subtitle="Practical account security and consent details." onBack={onBack}>
      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-teal-100 p-2 text-teal-600">
            <Shield className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-900">Account security</p>
            <p className="text-sm text-gray-600">Email: {account?.email || localStorage.getItem("email") || "Not available"}</p>
            <p className="text-sm text-gray-600">Email verification: {account?.email_verified ? "Verified" : "Not verified"}</p>
            <p className="text-sm text-gray-600">Password changes are handled through the reset-password email flow.</p>
            <p className="text-sm text-gray-500">Trusted devices: coming later.</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-gray-900">Consent history</p>
        <p className="mt-2 text-sm text-gray-600">Terms accepted: {formatDate(account?.terms_accepted_at)}</p>
        <p className="text-sm text-gray-600">Account created: {formatDate(account?.created_at)}</p>
      </Card>

      <Card>
        <p className="text-gray-900">Recent security activity</p>
        {loading ? <p className="mt-2 text-sm text-gray-500">Loading…</p> : null}
        {!loading && events.length === 0 ? <p className="mt-2 text-sm text-gray-500">No security activity yet.</p> : null}
        <div className="mt-3 space-y-3">
          {events.slice(0, 6).map((event) => (
            <div key={event.id} className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-900"><EventLabel event={event} /></p>
              <p className="text-xs text-gray-500">{formatDate(event.created_at)}</p>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

function SessionManagement({ onBack }: { onBack: () => void }) {
  const [sessions, setSessions] = useState<PatientSigninSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .listPatientSessions(getPatientDeviceId())
      .then((data) => {
        if (!cancelled) setSessions(data.sessions || []);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        deviceName: string;
        signInMethod: string;
        count: number;
        isCurrentDevice: boolean;
        firstSeenAt: string;
        lastSeenAt: string;
        ipAddresses: string[];
      }
    >();

    sessions.forEach((session) => {
      const deviceName = session.device_name || "Unknown device";
      const signInMethod = session.last_signin_method || "Unknown";
      const key = `${deviceName}::${signInMethod}`;
      const existing = groups.get(key);
      const firstSeenTime = new Date(session.first_seen_at).getTime();
      const lastSeenTime = new Date(session.last_seen_at).getTime();

      if (!existing) {
        groups.set(key, {
          id: key,
          deviceName,
          signInMethod,
          count: 1,
          isCurrentDevice: session.is_current_device,
          firstSeenAt: session.first_seen_at,
          lastSeenAt: session.last_seen_at,
          ipAddresses: session.last_ip_address ? [session.last_ip_address] : [],
        });
        return;
      }

      existing.count += 1;
      existing.isCurrentDevice = existing.isCurrentDevice || session.is_current_device;

      if (firstSeenTime < new Date(existing.firstSeenAt).getTime()) {
        existing.firstSeenAt = session.first_seen_at;
      }
      if (lastSeenTime > new Date(existing.lastSeenAt).getTime()) {
        existing.lastSeenAt = session.last_seen_at;
      }
      if (session.last_ip_address && !existing.ipAddresses.includes(session.last_ip_address)) {
        existing.ipAddresses.push(session.last_ip_address);
      }
    });

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    );
  }, [sessions]);

  return (
    <Shell title="Session Management" subtitle="Devices that have signed in to this account." onBack={onBack}>
      <Card>
        <p className="text-sm text-gray-600">
          MediLink groups repeated sign-ins from the same browser/device so the list is easier to read. Remote sign-out for other devices is coming later.
        </p>
      </Card>
      {loading ? <Card><p className="text-sm text-gray-500">Loading sessions…</p></Card> : null}
      {!loading && sessionGroups.length === 0 ? <Card><p className="text-sm text-gray-500">No device sessions recorded yet.</p></Card> : null}
      {sessionGroups.map((group) => (
        <Card key={group.id}>
          <div className="flex gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-gray-900">{group.deviceName}</p>
                {group.isCurrentDevice ? <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">This device</span> : null}
              </div>
              <p className="mt-1 text-sm text-gray-600">Sign-in method: {group.signInMethod}</p>
              <p className="text-sm text-gray-600">First seen: {formatDate(group.firstSeenAt)}</p>
              <p className="text-sm text-gray-600">Last active: {formatDate(group.lastSeenAt)}</p>
              <p className="text-xs text-gray-500">
                {group.count > 1 ? `${group.count} recorded sign-ins` : "1 recorded sign-in"}
                {group.ipAddresses.length > 0 ? ` • IP: ${group.ipAddresses.slice(0, 2).join(", ")}` : ""}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </Shell>
  );
}

const faqItems = [
  ["How do I connect to a provider?", "Open Connected Providers, search/select a provider, and connect. Connected providers can then support appointments, messages, and records."],
  ["How does Emergency ID work?", "Your Emergency ID QR opens a protected emergency access page. Responders must enter your access code unless they have an authorized provider ticket."],
  ["Who can see my emergency profile?", "Only someone with your Emergency ID link and access code, or an authorized provider responder flow, can view the emergency profile."],
  ["How do I book or reschedule appointments?", "Use the Appointments tab to book with connected providers. Existing appointments can be viewed or rescheduled when available."],
  ["How do medication requests work?", "Medication refill or change requests create a message thread with your provider so they can review and respond."],
  ["How do I reset my password?", "Use Forgot password on the sign-in screen. MediLink sends a reset link to your verified email."],
];

function FAQs({ onBack }: { onBack: () => void }) {
  return (
    <Shell title="FAQs" subtitle="Common MediLink ID questions." onBack={onBack}>
      {faqItems.map(([question, answer]) => (
        <Card key={question}>
          <p className="text-gray-900">{question}</p>
          <p className="mt-2 text-sm text-gray-600">{answer}</p>
        </Card>
      ))}
    </Shell>
  );
}

function ContactSupport({ onBack }: { onBack: () => void }) {
  const email = localStorage.getItem("email") || "";
  const supportEmail = "medilinkid.dev@gmail.com";
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent("MediLink ID support request")}&body=${encodeURIComponent(`Account email: ${email}\n\nHow can we help?\n`)}`;

  return (
    <Shell title="Contact Support" subtitle="Get help from the MediLink ID team." onBack={onBack}>
      <Card>
        <div className="flex gap-3">
          <div className="rounded-full bg-teal-100 p-2 text-teal-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-gray-900">Email support</p>
            <p className="mt-1 text-sm text-gray-600">For now, support requests go to {supportEmail}.</p>
            <p className="mt-2 text-xs text-red-600">MediLink ID is not for medical emergencies. Call emergency services if you need urgent help.</p>
          </div>
        </div>
        <Button asChild className="mt-4 w-full bg-teal-600 text-white hover:bg-teal-700">
          <a href={mailto}>
          Email Support
          </a>
        </Button>
      </Card>
    </Shell>
  );
}

function TutorialVideos({ onBack }: { onBack: () => void }) {
  const videos = ["Getting started", "Setting up Emergency ID", "Connecting providers", "Booking appointments", "Managing medications", "Using messages"];
  return (
    <Shell title="Tutorial Videos" subtitle="Short walkthroughs are coming soon." onBack={onBack}>
      {videos.map((video) => (
        <Card key={video}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <p className="text-gray-900">{video}</p>
              <p className="text-sm text-gray-500">Coming soon</p>
            </div>
          </div>
        </Card>
      ))}
    </Shell>
  );
}

function About({ onBack, onNavigate }: { onBack: () => void; onNavigate: (screen: string) => void }) {
  const links = [
    ["App Version", "app-version"],
    ["Privacy Policy", "privacy-policy"],
    ["Terms of Service", "terms-of-service"],
  ];
  return (
    <Shell title="About" subtitle="MediLink ID product information." onBack={onBack}>
      <Card>
        <p className="text-gray-900">MediLink ID</p>
        <p className="mt-2 text-sm text-gray-600">A patient and provider platform for appointments, records, messaging, medications, and emergency health access.</p>
        <p className="mt-2 text-xs text-gray-500">MediLink ID does not replace emergency medical care or professional medical advice.</p>
      </Card>
      <Card>
        {links.map(([label, screen]) => (
          <button key={screen} type="button" onClick={() => onNavigate(screen)} className="flex w-full items-center justify-between py-3 text-left">
            <span className="text-gray-900">{label}</span>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        ))}
      </Card>
    </Shell>
  );
}

function SimpleLegalPage({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: ReactNode }) {
  return (
    <Shell title={title} subtitle={subtitle} onBack={onBack}>
      <Card>
        <div className="space-y-3 text-sm text-gray-600">{children}</div>
      </Card>
    </Shell>
  );
}

export default function SettingsDetailPages({ page, onBack, onNavigate }: Props) {
  const content = useMemo(() => {
    switch (page) {
      case "privacy-settings":
        return <PrivacySettings onBack={onBack} />;
      case "session-management":
        return <SessionManagement onBack={onBack} />;
      case "faqs":
        return <FAQs onBack={onBack} />;
      case "contact-support":
        return <ContactSupport onBack={onBack} />;
      case "tutorial-videos":
        return <TutorialVideos onBack={onBack} />;
      case "about":
        return <About onBack={onBack} onNavigate={onNavigate || (() => {})} />;
      case "app-version":
        return (
          <SimpleLegalPage title="App Version" subtitle="Build information" onBack={onBack}>
            <p>Version: 1.0.0</p>
            <p>Branch: patient and provider beta experience.</p>
            <p>Recent updates include emergency QR improvements, provider-started appointments/messages, and dark mode.</p>
          </SimpleLegalPage>
        );
      case "privacy-policy":
        return (
          <SimpleLegalPage title="Privacy Policy" subtitle="Plain-language placeholder" onBack={onBack}>
            <p>MediLink ID stores account, profile, health, appointment, document, message, medication, and emergency profile information so patients and connected providers can use the app.</p>
            <p>Emergency access is limited to the information configured in your emergency profile and requires the emergency access flow.</p>
            <p>This policy is a working product placeholder and should be legally reviewed before production launch.</p>
          </SimpleLegalPage>
        );
      case "terms-of-service":
        return (
          <SimpleLegalPage title="Terms of Service" subtitle="Plain-language placeholder" onBack={onBack}>
            <p>MediLink ID helps patients manage health information and communicate with connected providers. It is not a substitute for emergency services or direct medical advice.</p>
            <p>Users are responsible for keeping account credentials secure and entering accurate information.</p>
            <p>These terms are a working product placeholder and should be legally reviewed before production launch.</p>
          </SimpleLegalPage>
        );
      default:
        return null;
    }
  }, [page, onBack, onNavigate]);

  return content;
}
