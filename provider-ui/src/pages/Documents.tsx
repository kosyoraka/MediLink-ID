import { useState } from 'react';
import { Filter, Upload, Download, FileText, File } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { patients } from '@/lib/mockData';
import { Document } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { UploadDocumentModal } from '@/components/modals/UploadDocumentModal';

export function Documents() {
  const [filterType, setFilterType] = useState('all');
  const [filterPatient, setFilterPatient] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Collect all documents from all patients
  const allDocuments: Document[] = patients.flatMap(patient => patient.documents);

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesPatient = filterPatient === 'all' || doc.patientId === filterPatient;
    return matchesType && matchesPatient;
  });

  const getDocumentIcon = (type: string) => {
    return FileText;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Lab Result': return 'default';
      case 'Prescription': return 'success';
      case 'Scan': return 'warning';
      case 'Report': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">Manage patient documents and files</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex-1">
                <option value="all">All Types</option>
                <option value="Lab Result">Lab Results</option>
                <option value="Prescription">Prescriptions</option>
                <option value="Scan">Scans</option>
                <option value="Report">Reports</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div>
              <Select value={filterPatient} onChange={(e) => setFilterPatient(e.target.value)}>
                <option value="all">All Patients</option>
                {patients.map(patient => (
                  <option key={patient.patientId} value={patient.patientId}>
                    {patient.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Input type="date" placeholder="Filter by date" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredDocuments.length} of {allDocuments.length} documents
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDocuments.map((doc) => {
          const Icon = getDocumentIcon(doc.type);
          return (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-gray-600">{doc.size}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Badge variant={getTypeColor(doc.type)} className="text-xs">
                    {doc.type}
                  </Badge>
                  <div>
                    <p className="text-xs text-gray-600">Patient</p>
                    <p className="text-sm font-medium text-gray-900">{doc.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Uploaded</p>
                    <p className="text-sm text-gray-900">{formatDate(doc.uploadDate)}</p>
                  </div>
                  {doc.notes && (
                    <div>
                      <p className="text-xs text-gray-600">Notes</p>
                      <p className="text-xs text-gray-900 line-clamp-2">{doc.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No documents found</p>
              <p className="text-sm mt-1">Try adjusting your filters or upload a new document</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}
