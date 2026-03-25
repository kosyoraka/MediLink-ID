import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Pill, Bell, RefreshCw, AlertCircle, Plus, ChevronDown, CheckCircle2, Edit, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { api, type PatientMedication } from '@/lib/api';

interface MedicationsProps {
  onBack: () => void;
}

type MedicationFormState = {
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  pharmacy: string;
  startDate: string;
  notes: string;
};

const emptyMedicationForm = (): MedicationFormState => ({
  name: '',
  dosage: '',
  frequency: '',
  purpose: '',
  pharmacy: '',
  startDate: '',
  notes: '',
});

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const sourceBadge = (medication: PatientMedication) =>
  medication.sourceType === 'provider'
    ? { label: 'Provider-prescribed', className: 'bg-emerald-100 text-emerald-700' }
    : { label: 'Patient-added', className: 'bg-blue-100 text-blue-700' };

export default function Medications({ onBack }: MedicationsProps) {
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<PatientMedication | null>(null);
  const [requestChangeMedication, setRequestChangeMedication] = useState<PatientMedication | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [loggingMedicationId, setLoggingMedicationId] = useState<string | null>(null);
  const [intakeForm, setIntakeForm] = useState({ status: 'taken' as 'taken' | 'missed' | 'skipped', loggedForDate: '', note: '' });
  const [form, setForm] = useState<MedicationFormState>(emptyMedicationForm());
  const [changeRequestMessage, setChangeRequestMessage] = useState('');

  const loadMedications = async () => {
    setLoading(true);
    try {
      const res = await api.listMyMedications();
      setMedications(res.medications || []);
    } catch (error) {
      console.error('Failed to load medications:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
  }, []);

  const activeMedications = useMemo(() => medications.filter((med) => med.isActive), [medications]);
  const inactiveMedications = useMemo(() => medications.filter((med) => !med.isActive), [medications]);

  const openPersonalMedicationModal = (medication?: PatientMedication) => {
    if (medication) {
      setEditingMedication(medication);
      setForm({
        name: medication.name || '',
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
        purpose: medication.purpose || '',
        pharmacy: medication.pharmacy || '',
        startDate: medication.startDate ? String(medication.startDate).slice(0, 10) : '',
        notes: medication.notes || '',
      });
    } else {
      setEditingMedication(null);
      setForm(emptyMedicationForm());
    }
    setShowAddModal(true);
  };

  const updateMedication = async (
    medicationId: string,
    body: {
      remindersEnabled?: boolean;
      isActive?: boolean;
    }
  ) => {
    try {
      const res = await api.updateMyMedication(medicationId, body);
      setMedications((current) => current.map((item) => (item.id === medicationId ? res.medication : item)));
    } catch (error) {
      console.error('Failed to update medication:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update medication');
    }
  };

  const requestRefill = async (medicationId: string) => {
    try {
      const res = await api.requestMedicationRefill(medicationId);
      setMedications((current) => current.map((item) => (item.id === medicationId ? res.medication : item)));
      setStatusMessage('Refill request sent.');
    } catch (error) {
      console.error('Failed to request refill:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to request refill');
    }
  };

  const submitIntakeLog = async () => {
    if (!loggingMedicationId) return;
    try {
      const res = await api.logMedicationIntake(loggingMedicationId, {
        status: intakeForm.status,
        loggedForDate: intakeForm.loggedForDate || undefined,
        note: intakeForm.note || undefined,
      });
      setMedications((current) => current.map((item) => (item.id === loggingMedicationId ? res.medication : item)));
      setLoggingMedicationId(null);
      setIntakeForm({ status: 'taken', loggedForDate: '', note: '' });
      setStatusMessage('Medication intake logged.');
    } catch (error) {
      console.error('Failed to log medication intake:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to log medication intake');
    }
  };

  const intakeSummary = (med: PatientMedication) => {
    if (!med.lastIntakeStatus || !med.lastIntakeDate) return 'No intake logged yet';
    const label =
      med.lastIntakeStatus === 'taken' ? 'Taken' : med.lastIntakeStatus === 'missed' ? 'Missed' : 'Skipped';
    return `${label} on ${formatDate(med.lastIntakeDate)}`;
  };

  const submitPersonalMedication = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingMedication) {
        const res = await api.updateMyMedication(editingMedication.id, {
          name: form.name,
          dosage: form.dosage || undefined,
          frequency: form.frequency || undefined,
          purpose: form.purpose || undefined,
          pharmacy: form.pharmacy || undefined,
          startDate: form.startDate || undefined,
          notes: form.notes || undefined,
        });
        setMedications((current) => current.map((item) => (item.id === editingMedication.id ? res.medication : item)));
        setStatusMessage('Personal medication updated.');
      } else {
        const res = await api.createMyMedication({
          name: form.name,
          dosage: form.dosage || undefined,
          frequency: form.frequency || undefined,
          purpose: form.purpose || undefined,
          pharmacy: form.pharmacy || undefined,
          startDate: form.startDate || undefined,
          notes: form.notes || undefined,
        });
        setMedications((current) => [res.medication, ...current]);
        setStatusMessage('Personal medication added.');
      }
      setForm(emptyMedicationForm());
      setShowAddModal(false);
      setEditingMedication(null);
    } catch (error) {
      console.error('Failed to save medication:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to save medication');
    } finally {
      setSaving(false);
    }
  };

  const submitChangeRequest = async () => {
    if (!requestChangeMedication || !changeRequestMessage.trim()) return;
    setSaving(true);
    try {
      await api.requestMedicationChange(requestChangeMedication.id, { message: changeRequestMessage.trim() });
      setRequestChangeMedication(null);
      setChangeRequestMessage('');
      setStatusMessage('Change request sent to the prescribing provider.');
    } catch (error) {
      console.error('Failed to request medication change:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to request medication change');
    } finally {
      setSaving(false);
    }
  };

  const renderMedicationCard = (med: PatientMedication) => {
    const badge = sourceBadge(med);
    return (
      <div key={med.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Pill className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-gray-900 mb-1">{med.name}</h3>
                <Badge className={`${badge.className} border-0`}>{badge.label}</Badge>
                {!med.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <p className="text-gray-600">{[med.dosage, med.frequency].filter(Boolean).join(' • ') || 'Details not added yet'}</p>
              <p className="text-sm text-gray-500 mt-1">{med.prescriberName}</p>
              {med.hospitalName ? <p className="text-xs text-gray-500 mt-1">{med.hospitalName}</p> : null}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Started:</span>
              <span className="text-gray-900">{formatDate(med.startDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Refills remaining:</span>
              <span className="text-gray-900">{med.refillsRemaining ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pharmacy:</span>
              <span className="text-gray-900">{med.pharmacy || '—'}</span>
            </div>
          </div>

          {med.purpose ? (
            <details className="mb-4">
              <summary className="text-sm text-teal-600 cursor-pointer flex items-center gap-1">
                What is this for?
                <ChevronDown className="w-4 h-4" />
              </summary>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">{med.purpose}</p>
              </div>
            </details>
          ) : null}

          {med.notes ? (
            <div className="mb-4 rounded-lg bg-amber-50 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-700">Notes</p>
              <p className="text-sm text-gray-700 mt-1">{med.notes}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Medication reminder</span>
            </div>
            <Switch
              checked={med.remindersEnabled}
              onCheckedChange={(checked) => updateMedication(med.id, { remindersEnabled: Boolean(checked) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setLoggingMedicationId(med.id)}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Log Intake
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={() => requestRefill(med.id)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Request Refill
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={() => updateMedication(med.id, { isActive: !med.isActive })}>
              {med.isActive ? 'Archive' : 'Reactivate'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {med.sourceType === 'patient' ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => openPersonalMedicationModal(med)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit Personal Medication
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => {
                setRequestChangeMedication(med);
                setChangeRequestMessage('');
              }}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Request Change
              </Button>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            {intakeSummary(med)}
            {med.lastRefillRequestedAt ? ` • Refill requested ${formatDate(med.lastRefillRequestedAt)}` : ''}
          </div>

          {med.recentIntakeLogs.length > 0 ? (
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Recent Intake Log</p>
              <div className="space-y-2">
                {med.recentIntakeLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-3 text-xs text-gray-600">
                    <span>{formatDate(log.loggedForDate)}</span>
                    <span className="capitalize">{log.status}</span>
                    <span className="flex-1 text-right">{log.note || 'No note'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-gray-900">Medications</h1>
          </div>
          <Button className="gap-2" onClick={() => openPersonalMedicationModal()}>
            <Plus className="w-4 h-4" />
            Add Personal Medication
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-gray-900 mb-1">Medication Center</h3>
              <p className="text-sm text-gray-600">
                Provider-prescribed medications appear here automatically. You can also add personal medications like OTC products or supplements.
              </p>
            </div>
          </div>
        </div>

        {statusMessage ? <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm text-gray-600">{statusMessage}</div> : null}

        <div className="space-y-3">
          <h2 className="text-gray-900">Active Medications</h2>
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading medications…</div>
          ) : activeMedications.length > 0 ? (
            activeMedications.map(renderMedicationCard)
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No active medications on file.</div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-gray-900">Medication History</h2>
          {inactiveMedications.length > 0 ? (
            inactiveMedications.map(renderMedicationCard)
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No archived medications yet.</div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">{editingMedication ? 'Edit Personal Medication' : 'Add Personal Medication'}</h3>
              <button type="button" onClick={() => {
                setShowAddModal(false);
                setEditingMedication(null);
                setForm(emptyMedicationForm());
              }} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Medication name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Dosage" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Pharmacy" value={form.pharmacy} onChange={(e) => setForm({ ...form, pharmacy: e.target.value })} />
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[100px]" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowAddModal(false);
                setEditingMedication(null);
                setForm(emptyMedicationForm());
              }}>Cancel</Button>
              <Button className="flex-1" onClick={submitPersonalMedication} disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : editingMedication ? 'Save Changes' : 'Add Medication'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {requestChangeMedication && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">Request Medication Change</h3>
              <button type="button" onClick={() => {
                setRequestChangeMedication(null);
                setChangeRequestMessage('');
              }} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-900">{requestChangeMedication.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                This sends a request to the prescribing provider instead of editing the medication directly.
              </p>
            </div>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[120px]"
              placeholder="Describe what should change, such as dose, frequency, or why the medication details look wrong."
              value={changeRequestMessage}
              onChange={(e) => setChangeRequestMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {
                setRequestChangeMedication(null);
                setChangeRequestMessage('');
              }}>Cancel</Button>
              <Button className="flex-1" onClick={submitChangeRequest} disabled={saving || !changeRequestMessage.trim()}>
                {saving ? 'Sending…' : 'Send Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loggingMedicationId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">Log Medication Intake</h3>
              <button type="button" onClick={() => setLoggingMedicationId(null)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="space-y-3">
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={intakeForm.status} onChange={(e) => setIntakeForm({ ...intakeForm, status: e.target.value as 'taken' | 'missed' | 'skipped' })}>
                <option value="taken">Taken</option>
                <option value="missed">Missed</option>
                <option value="skipped">Skipped</option>
              </select>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2" value={intakeForm.loggedForDate} onChange={(e) => setIntakeForm({ ...intakeForm, loggedForDate: e.target.value })} />
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[100px]" placeholder="Optional note" value={intakeForm.note} onChange={(e) => setIntakeForm({ ...intakeForm, note: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setLoggingMedicationId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={submitIntakeLog}>Save Log</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
