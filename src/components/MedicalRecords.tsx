import { useState } from 'react';
import { Search, SlidersHorizontal, TestTube, FileText, Image, Stethoscope, ChevronRight, ArrowLeft, Download, Share2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type RecordTab = 'all' | 'labs' | 'imaging' | 'visits' | 'documents';

interface Record {
  id: string;
  type: 'lab' | 'imaging' | 'visit' | 'document';
  title: string;
  provider: string;
  date: string;
  status?: 'new' | 'viewed';
  isNew?: boolean;
}

const mockRecords: Record[] = [
  { id: '1', type: 'lab', title: 'Complete Blood Count (CBC)', provider: 'LifeLabs - Toronto', date: 'Nov 15, 2025', status: 'new', isNew: true },
  { id: '2', type: 'lab', title: 'Lipid Panel', provider: 'LifeLabs - Toronto', date: 'Nov 15, 2025', status: 'new', isNew: true },
  { id: '3', type: 'imaging', title: 'Chest X-Ray', provider: 'Sunnybrook Hospital', date: 'Nov 10, 2025' },
  { id: '4', type: 'visit', title: 'Annual Physical Exam', provider: 'Dr. Sarah Johnson', date: 'Nov 1, 2025' },
  { id: '5', type: 'document', title: 'Vaccination Record', provider: 'Shoppers Drug Mart', date: 'Oct 28, 2025' },
  { id: '6', type: 'lab', title: 'Thyroid Function Test', provider: 'LifeLabs - Toronto', date: 'Oct 20, 2025' },
];

export default function MedicalRecords() {
  const [activeTab, setActiveTab] = useState<RecordTab>('all');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

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

  const filteredRecords = activeTab === 'all' 
    ? mockRecords 
    : mockRecords.filter(r => r.type === activeTab.replace('s', '') as any);

  if (selectedRecord) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setSelectedRecord(null)} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-gray-900">Lab Results</h2>
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

          {/* Results in Plain Language */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-gray-900">Test Results</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {[
                { name: 'White Blood Cells', value: '7.2', unit: '× 10⁹/L', status: 'normal', range: '4.0-11.0' },
                { name: 'Red Blood Cells', value: '4.8', unit: '× 10¹²/L', status: 'normal', range: '4.5-5.5' },
                { name: 'Hemoglobin', value: '14.2', unit: 'g/dL', status: 'normal', range: '13.5-17.5' },
                { name: 'Platelets', value: '250', unit: '× 10⁹/L', status: 'normal', range: '150-400' },
              ].map((result, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-gray-900">{result.name}</p>
                      <p className="text-sm text-gray-500">Normal range: {result.range} {result.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900">{result.value} {result.unit}</p>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <details className="text-sm">
                    <summary className="text-teal-600 cursor-pointer">What does this mean?</summary>
                    <p className="text-gray-600 mt-2">
                      {result.name} are important for {result.name === 'White Blood Cells' ? 'fighting infections' : result.name === 'Red Blood Cells' ? 'carrying oxygen throughout your body' : result.name === 'Hemoglobin' ? 'transporting oxygen in your blood' : 'blood clotting'}. Your level is within the normal range.
                    </p>
                  </details>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor's Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-gray-900 mb-2">Doctor's Notes</h3>
            <p className="text-gray-700">All values within normal limits. No action required. Continue current health regimen.</p>
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
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search your records..."
            className="pl-10 pr-10"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'labs', label: 'Labs' },
            { key: 'imaging', label: 'Imaging' },
            { key: 'visits', label: 'Visits' },
            { key: 'documents', label: 'Documents' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as RecordTab)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
                  {record.isNew && (
                    <Badge className="bg-blue-100 text-blue-700 border-0">New</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{record.provider}</p>
                <p className="text-sm text-gray-500">{record.date}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
