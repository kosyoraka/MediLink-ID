import { useMemo, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  TestTube,
  FileText,
  Image,
  Stethoscope,
  ChevronRight,
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  Upload,
  Pill,
  CreditCard,
  Folder,
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type RecordTab = 'all' | 'labs' | 'imaging' | 'visits' | 'documents';
type DocumentCategory = 'all' | 'labs' | 'imaging' | 'visits' | 'prescriptions' | 'insurance';
type SourceFilter = 'all' | 'provider' | 'patient';

interface RecordItem {
  id: string;
  type: 'lab' | 'imaging' | 'visit' | 'document';
  title: string;
  provider: string;
  date: string;
  status?: 'new' | 'viewed';
  isNew?: boolean;
}

interface DocumentItem {
  id: string;
  title: string;
  category: Exclude<DocumentCategory, 'all'>;
  date: string;
  size: string;
  provider: string;
  source: 'provider' | 'patient';
}

const mockRecords: RecordItem[] = [
  { id: '1', type: 'lab', title: 'Complete Blood Count (CBC)', provider: 'LifeLabs - Toronto', date: 'Nov 15, 2025', status: 'new', isNew: true },
  { id: '2', type: 'lab', title: 'Lipid Panel', provider: 'LifeLabs - Toronto', date: 'Nov 15, 2025', status: 'new', isNew: true },
  { id: '3', type: 'imaging', title: 'Chest X-Ray', provider: 'Sunnybrook Hospital', date: 'Nov 10, 2025' },
  { id: '4', type: 'visit', title: 'Annual Physical Exam', provider: 'Dr. Sarah Johnson', date: 'Nov 1, 2025' },
  { id: '5', type: 'document', title: 'Vaccination Record', provider: 'Shoppers Drug Mart', date: 'Oct 28, 2025' },
  { id: '6', type: 'lab', title: 'Thyroid Function Test', provider: 'LifeLabs - Toronto', date: 'Oct 20, 2025' },
];

const mockDocuments: DocumentItem[] = [
  { id: 'd1', title: 'Complete Blood Count Results', category: 'labs', date: 'Nov 15, 2025', size: '245 KB', provider: 'LifeLabs', source: 'provider' },
  { id: 'd2', title: 'Annual Physical Visit Summary', category: 'visits', date: 'Oct 15, 2025', size: '180 KB', provider: 'Dr. Sarah Johnson', source: 'provider' },
  { id: 'd3', title: 'Chest X-Ray Report', category: 'imaging', date: 'Nov 10, 2025', size: '1.2 MB', provider: 'Sunnybrook Hospital', source: 'provider' },
  { id: 'd4', title: 'Lisinopril Prescription', category: 'prescriptions', date: 'Oct 1, 2025', size: '120 KB', provider: 'Dr. Sarah Johnson', source: 'provider' },
  { id: 'd5', title: 'OHIP Card - Front', category: 'insurance', date: 'Jan 1, 2025', size: '890 KB', provider: 'Personal Upload', source: 'patient' },
];

const documentCategories = [
  { key: 'all' as const, label: 'All Documents', icon: Folder },
  { key: 'labs' as const, label: 'Labs', icon: TestTube },
  { key: 'imaging' as const, label: 'Imaging', icon: Image },
  { key: 'visits' as const, label: 'Visits', icon: FileText },
  { key: 'prescriptions' as const, label: 'Prescriptions', icon: Pill },
  { key: 'insurance' as const, label: 'Insurance', icon: CreditCard },
];

export default function MedicalRecords() {
  const [activeTab, setActiveTab] = useState<RecordTab>('documents');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [recordSearch, setRecordSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [activeDocCategory, setActiveDocCategory] = useState<DocumentCategory>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const getIcon = (type: string) => {
    switch (type) {
      case 'lab':
        return <TestTube className="w-5 h-5" />;
      case 'imaging':
        return <Image className="w-5 h-5" />;
      case 'visit':
        return <Stethoscope className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'lab':
        return 'bg-green-100 text-green-600';
      case 'imaging':
        return 'bg-blue-100 text-blue-600';
      case 'visit':
        return 'bg-purple-100 text-purple-600';
      case 'document':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getDocumentCategoryColor = (category: string) => {
    switch (category) {
      case 'labs':
        return 'bg-green-100 text-green-600';
      case 'imaging':
        return 'bg-blue-100 text-blue-600';
      case 'visits':
        return 'bg-purple-100 text-purple-600';
      case 'prescriptions':
        return 'bg-orange-100 text-orange-600';
      case 'insurance':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredRecords = useMemo(() => {
    const byType =
      activeTab === 'all' ? mockRecords : mockRecords.filter((r) => r.type === activeTab.replace('s', ''));

    if (!recordSearch.trim()) return byType;
    const q = recordSearch.toLowerCase();
    return byType.filter((r) => r.title.toLowerCase().includes(q) || r.provider.toLowerCase().includes(q));
  }, [activeTab, recordSearch]);

  const filteredDocuments = useMemo(() => {
    return mockDocuments.filter((doc) => {
      if (activeDocCategory !== 'all' && doc.category !== activeDocCategory) return false;
      if (sourceFilter !== 'all' && doc.source !== sourceFilter) return false;
      if (docSearch && !doc.title.toLowerCase().includes(docSearch.toLowerCase())) return false;
      return true;
    });
  }, [activeDocCategory, sourceFilter, docSearch]);

  if (selectedRecord) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSelectedRecord(null)} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-gray-900">Record Details</h2>
          <button className="text-teal-600">
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-gray-900 mb-2">Complete Blood Count</h1>
            <div className="flex items-center gap-2 text-gray-600">
              <span>LifeLabs - Toronto</span>
              <span>•</span>
              <span>Nov 15, 2025</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-gray-900">Test Results</h3>
            </div>

            <div className="divide-y divide-gray-200">
              {[
                { name: 'White Blood Cells', value: '7.2', unit: '× 10⁹/L', range: '4.0-11.0' },
                { name: 'Red Blood Cells', value: '4.8', unit: '× 10¹²/L', range: '4.5-5.5' },
                { name: 'Hemoglobin', value: '14.2', unit: 'g/dL', range: '13.5-17.5' },
                { name: 'Platelets', value: '250', unit: '× 10⁹/L', range: '150-400' },
              ].map((result) => (
                <div key={result.name} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-gray-900">{result.name}</p>
                      <p className="text-sm text-gray-500">
                        Normal range: {result.range} {result.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900">
                        {result.value} {result.unit}
                      </p>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" className="w-full">
              Add to Emergency Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <h1 className="text-gray-900 mb-4">Medical Records</h1>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search documents..."
            className="pl-10 pr-10"
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTab === 'documents' ? (
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
            <Button variant="outline" className="flex-1">
              Request from Provider
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'All Sources' },
              { key: 'provider', label: 'Provider Uploaded' },
              { key: 'patient', label: 'Patient Uploaded' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSourceFilter(filter.key as SourceFilter)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap text-sm ${
                  sourceFilter === filter.key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {documentCategories.map((category) => {
              const Icon = category.icon;
              const count =
                category.key === 'all'
                  ? mockDocuments.length
                  : mockDocuments.filter((d) => d.category === category.key).length;

              return (
                <button
                  key={category.key}
                  onClick={() => setActiveDocCategory(category.key)}
                  className={`rounded-xl border p-3 text-left ${
                    activeDocCategory === category.key
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mb-2 ${
                      activeDocCategory === category.key ? 'text-teal-600' : 'text-gray-600'
                    }`}
                  />
                  <p className="text-xs text-gray-900">{category.label}</p>
                  <p className="text-xs text-gray-500">{count} files</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {filteredDocuments.map((doc) => {
              const iconType = doc.category === 'labs' ? 'lab' : doc.category === 'imaging' ? 'imaging' : doc.category === 'visits' ? 'visit' : 'document';
              return (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${getDocumentCategoryColor(doc.category)} flex items-center justify-center flex-shrink-0`}>
                      {getIcon(iconType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-gray-900 text-sm">{doc.title}</h4>
                        <Badge className={doc.source === 'provider' ? 'bg-green-100 text-green-700 border-0' : 'bg-blue-100 text-blue-700 border-0'}>
                          {doc.source === 'provider' ? 'Verified' : 'Patient Upload'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{doc.provider}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{doc.date}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredDocuments.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
              <Folder className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-700">No documents found</p>
              <p className="text-xs text-gray-500">Try another filter or upload a new file</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {filteredRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => setSelectedRecord(record.id)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${getIconColor(record.type)} flex items-center justify-center flex-shrink-0`}>
                  {getIcon(record.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-gray-900">{record.title}</h3>
                    {record.isNew && <Badge className="bg-blue-100 text-blue-700 border-0">New</Badge>}
                  </div>
                  <p className="text-sm text-gray-600">{record.provider}</p>
                  <p className="text-sm text-gray-500">{record.date}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
