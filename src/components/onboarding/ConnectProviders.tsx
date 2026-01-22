import { ArrowLeft, Search, Building2, TestTube, Stethoscope, Hospital, CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useEffect, useMemo, useState } from "react";
import { api, Provider } from "../../lib/api";

interface ConnectProvidersProps {
  connectedProviderIds: string[];
  onConnect: (providerId: string) => void;
  onNext: () => void;
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

export default function ConnectProviders({
  connectedProviderIds,
  onConnect,
  onNext,
  onBack,
}: ConnectProvidersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { providers } = await api.listProviders();
        if (!mounted) return;

        setProviders(providers);
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

  const connectedProviders = useMemo(() => {
    const set = new Set(connectedProviderIds);
    return providers.filter((p) => set.has(p.id));
  }, [providers, connectedProviderIds]);

  const filteredProviders = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    const connectedSet = new Set(connectedProviderIds);

    return providers.filter((provider) => {
      const matchesSearch =
        !s ||
        provider.name.toLowerCase().includes(s) ||
        provider.type.toLowerCase().includes(s);

      const notConnected = !connectedSet.has(provider.id);

      return matchesSearch && notConnected;
    });
  }, [providers, searchTerm, connectedProviderIds]);

  const handleConnect = async (providerId: string) => {
    // Save to DB first so refresh doesn’t lose it
    await api.connectProvider(providerId, "signup");
    onConnect(providerId);
  };

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
          <div className="h-2 flex-1 bg-teal-600 rounded-full" />
          <div className="h-2 flex-1 bg-gray-200 rounded-full" />
        </div>
        <p className="text-sm text-gray-600">Step 2 of 3</p>
      </div>

      <h1 className="mb-2 text-gray-900">Connect your providers</h1>
      <p className="text-gray-600 mb-6">
        Link your healthcare providers to access all your medical records in one place.
      </p>

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

      {loading && <div className="mb-6 text-gray-500">Loading providers…</div>}

      {connectedProviders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-gray-700 mb-4">Connected ({connectedProviders.length})</h2>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            {connectedProviders.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-600">{p.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-gray-700 mb-4">Popular Providers</h2>

        {!loading && searchTerm && filteredProviders.length === 0 && (
          <p className="text-gray-500">No providers found</p>
        )}

        <div className="space-y-3">
          {filteredProviders.map((provider) => {
            const meta = typeMeta(provider.type);
            const Icon = meta.Icon;

            return (
              <button
                key={provider.id}
                onClick={() => handleConnect(provider.id)}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:bg-teal-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${meta.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-gray-900">{provider.name}</h3>
                    <p className="text-sm text-gray-500">{provider.type}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect(provider.id);
                    }}
                  >
                    Connect
                  </Button>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 max-w-md mx-auto">
        <Button onClick={onNext} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12">
          Continue
        </Button>
        <p className="text-center text-sm text-gray-500 mt-3">You can add more providers later</p>
      </div>
    </div>
  );
}
