import { ArrowLeft, Search, Building2, TestTube, Stethoscope, Hospital, CheckCircle, X, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useMemo, useState } from "react";
import { api, Provider } from "../lib/api";

interface ManageProvidersProps {
  onBack: () => void;
}

function typeMeta(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("hospital")) return { Icon: Hospital, color: "bg-blue-100 text-blue-600" };
  if (t.includes("laboratory") || t.includes("lab")) return { Icon: TestTube, color: "bg-green-100 text-green-600" };
  if (t.includes("pharmacy")) return { Icon: Building2, color: "bg-red-100 text-red-600" };
  if (t.includes("doctor")) return { Icon: Stethoscope, color: "bg-teal-100 text-teal-600" };
  if (t.includes("clinic")) return { Icon: Building2, color: "bg-orange-100 text-orange-600" };
  return { Icon: Building2, color: "bg-gray-100 text-gray-600" };
}

export default function ManageProviders({ onBack }: ManageProvidersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddProviders, setShowAddProviders] = useState(false);

  const [directory, setDirectory] = useState<Provider[]>([]);
  const [connected, setConnected] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [dirRes, myRes] = await Promise.all([api.listProviders(), api.listMyProviders()]);
        if (!mounted) return;

        setDirectory(dirRes.providers);
        setConnected(myRes.providers);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load providers");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const connectedIds = useMemo(() => new Set(connected.map((p) => p.id)), [connected]);

  const filteredProviders = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();

    return directory.filter((provider) => {
      const matchesSearch =
        !s ||
        provider.name.toLowerCase().includes(s) ||
        provider.type.toLowerCase().includes(s);

      const notConnected = !connectedIds.has(provider.id);
      return matchesSearch && notConnected;
    });
  }, [directory, searchTerm, connectedIds]);

  const connect = async (provider: Provider) => {
    await api.connectProvider(provider.id, "settings");
    setConnected((prev) => [provider, ...prev]);
  };

  const disconnect = async (providerId: string) => {
    await api.disconnectProvider(providerId);
    setConnected((prev) => prev.filter((p) => p.id !== providerId));
  };

  if (showAddProviders) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setShowAddProviders(false)} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">Add Provider</h1>
          <div className="w-6" />
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search for your provider..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && searchTerm && filteredProviders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No providers found</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredProviders.map((provider) => {
            const meta = typeMeta(provider.type);
            const Icon = meta.Icon;

            return (
              <button
                key={provider.id}
                onClick={async () => {
                  await connect(provider);
                  setShowAddProviders(false);
                }}
                className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${meta.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-gray-900">{provider.name}</p>
                    <p className="text-sm text-gray-500">{provider.type}</p>
                  </div>
                  <Plus className="w-5 h-5 text-teal-600" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 text-white p-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Connected Providers</h1>
          <div className="w-6" />
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm mb-1">Total Providers</p>
              <p className="text-3xl">{connected.length}</p>
            </div>
            <Button onClick={() => setShowAddProviders(true)} className="bg-white text-teal-600 hover:bg-teal-50">
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : connected.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No Providers Connected</h3>
            <p className="text-gray-600 mb-6">
              Connect your healthcare providers to access all your medical records in one place.
            </p>
            <Button onClick={() => setShowAddProviders(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Provider
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connected.map((provider) => {
              const meta = typeMeta(provider.type);
              const Icon = meta.Icon;

              return (
                <div key={provider.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${meta.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900">{provider.name}</p>
                      <p className="text-sm text-gray-500">{provider.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <button
                        onClick={() => disconnect(provider.id)}
                        className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                        aria-label={`Disconnect ${provider.name}`}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {connected.length > 0 && (
          <div className="mt-6 bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 mb-1">HL7 FHIR Compliant</h3>
                <p className="text-sm text-gray-600">
                  Your providers are connected using secure, industry-standard health data protocols.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
