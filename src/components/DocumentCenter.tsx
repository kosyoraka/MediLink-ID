import { useState } from 'react';
import { ArrowLeft, Search, Upload, TestTube, FileText, Image, Pill, CreditCard, FileCheck, Folder, Star, Download, Share2, Trash2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface DocumentCenterProps {
  onBack: () => void;
}

type DocumentCategory = 'all' | 'labs' | 'visits' | 'prescriptions' | 'insurance' | 'imaging';

interface Document {
  id: string;
  title: string;
  category: string;
  date: string;
  size: string;
  provider: string;
  starred?: boolean;
}

const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Complete Blood Count Results',
    category: 'labs',
    date: 'Nov 15, 2025',
    size: '245 KB',
    provider: 'LifeLabs',
    starred: true,
  },
  {
    id: '2',
    title: 'Annual Physical - Visit Summary',
    category: 'visits',
    date: 'Oct 15, 2025',
    size: '180 KB',
    provider: 'Dr. Sarah Johnson',
  },
  {
    id: '3',
    title: 'Chest X-Ray Report',
    category: 'imaging',
    date: 'Nov 10, 2025',
    size: '1.2 MB',
    provider: 'Sunnybrook Hospital',
  },
  {
    id: '4',
    title: 'Lisinopril Prescription',
    category: 'prescriptions',
    date: 'Oct 1, 2025',
    size: '120 KB',
    provider: 'Dr. Sarah Johnson',
  },
  {
    id: '5',
    title: 'OHIP Card - Front',
    category: 'insurance',
    date: 'Jan 1, 2025',
    size: '890 KB',
    provider: 'Personal',
    starred: true,
  },
];

export default function DocumentCenter({ onBack }: DocumentCenterProps) {
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { key: 'all' as const, label: 'All Documents', icon: Folder, count: 12 },
    { key: 'labs' as const, label: 'Lab Results', icon: TestTube, count: 5 },
    { key: 'imaging' as const, label: 'Imaging', icon: Image, count: 3 },
    { key: 'visits' as const, label: 'Visit Summaries', icon: FileText, count: 8 },
    { key: 'prescriptions' as const, label: 'Prescriptions', icon: Pill, count: 4 },
    { key: 'insurance' as const, label: 'Insurance', icon: CreditCard, count: 2 },
  ];

  const filteredDocs = mockDocuments.filter(doc => {
    if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'labs': return TestTube;
      case 'imaging': return Image;
      case 'visits': return FileText;
      case 'prescriptions': return Pill;
      case 'insurance': return CreditCard;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'labs': return 'bg-green-100 text-green-600';
      case 'imaging': return 'bg-blue-100 text-blue-600';
      case 'visits': return 'bg-purple-100 text-purple-600';
      case 'prescriptions': return 'bg-orange-100 text-orange-600';
      case 'insurance': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Document Center</h1>
        </div>
        <p className="text-orange-100">All your health documents in one place</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Upload */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  activeCategory === category.key
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${
                  activeCategory === category.key ? 'text-teal-600' : 'text-gray-600'
                }`} />
                <p className="text-sm text-gray-900">{category.label}</p>
                <p className="text-xs text-gray-500">{category.count} files</p>
              </button>
            );
          })}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm whitespace-nowrap">
            Recent
          </button>
          <button className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm whitespace-nowrap">
            <Star className="w-3 h-3 inline mr-1" />
            Starred
          </button>
          <button className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm whitespace-nowrap">
            Shared
          </button>
        </div>

        {/* Documents List */}
        <div>
          <h3 className="text-gray-900 mb-3">
            {activeCategory === 'all' ? 'All Documents' : categories.find(c => c.key === activeCategory)?.label}
          </h3>
          <div className="space-y-2">
            {filteredDocs.map((doc) => {
              const Icon = getCategoryIcon(doc.category);
              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${getCategoryColor(doc.category)} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-gray-900">{doc.title}</h4>
                        {doc.starred && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{doc.provider}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                    <Button size="sm" variant="outline">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No documents found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters or upload new documents</p>
          </div>
        )}
      </div>
    </div>
  );
}