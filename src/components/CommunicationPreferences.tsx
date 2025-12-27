import { useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, Bell, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';

interface CommunicationPreferencesProps {
  onBack: () => void;
}

export default function CommunicationPreferences({ onBack }: CommunicationPreferencesProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['appointments']);
  
  // State for all preferences
  const [appointmentReminders, setAppointmentReminders] = useState({
    email: true,
    sms: true,
    push: true,
    phone: false,
    firstReminder: '1-day',
    secondReminder: '2-hours',
  });

  const [labResults, setLabResults] = useState({
    email: true,
    sms: false,
    push: true,
    notifyType: 'immediate',
  });

  const [medicationRefill, setMedicationRefill] = useState({
    push: true,
    daysBeforeNotify: 7,
    autoRequest: false,
  });

  const [providerMessages, setProviderMessages] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const [healthTasks, setHealthTasks] = useState({
    push: true,
    emailDigest: 'weekly',
    sms: false,
  });

  const [preventiveCare, setPreventiveCare] = useState({
    email: 'monthly',
    push: false,
  });

  const [systemUpdates, setSystemUpdates] = useState({
    email: false,
    push: false,
    optOutMarketing: true,
  });

  const [preferredContact, setPreferredContact] = useState({
    primary: 'email',
    secondary: 'sms',
    bestTimeToCall: 'weekdays-9am-5pm',
    language: 'english',
  });

  const [allowEmergencyDuringQuiet, setAllowEmergencyDuringQuiet] = useState(true);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const renderChannelToggles = (state: any, setState: any, channels: string[]) => {
    return (
      <div className="space-y-3">
        {channels.map((channel) => {
          const icons = {
            email: <Mail className="w-4 h-4" />,
            sms: <MessageSquare className="w-4 h-4" />,
            push: <Bell className="w-4 h-4" />,
            phone: <Phone className="w-4 h-4" />,
          };

          return (
            <div key={channel} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  {icons[channel as keyof typeof icons]}
                </div>
                <div>
                  <p className="text-gray-900 capitalize">{channel === 'sms' ? 'SMS' : channel === 'push' ? 'Push Notification' : channel}</p>
                  {channel === 'email' && <p className="text-sm text-gray-500">sarah.johnson@email.com</p>}
                  {channel === 'sms' && <p className="text-sm text-gray-500">(416) 555-0123</p>}
                </div>
              </div>
              <Switch
                checked={state[channel]}
                onCheckedChange={(checked) => setState({ ...state, [channel]: checked })}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-gray-900">Communication Preferences</h1>
      </div>

      <div className="p-4 space-y-3">
        {/* Appointment Reminders */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('appointments')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-gray-900">Appointment Reminders</h3>
                <p className="text-sm text-gray-500">1 day before, 2 hours before</p>
              </div>
            </div>
            {expandedSections.includes('appointments') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('appointments') && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              {renderChannelToggles(appointmentReminders, setAppointmentReminders, ['email', 'sms', 'push', 'phone'])}
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-700 mb-2">First Reminder</p>
                  <select 
                    className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                    value={appointmentReminders.firstReminder}
                    onChange={(e) => setAppointmentReminders({ ...appointmentReminders, firstReminder: e.target.value })}
                  >
                    <option value="1-week">1 week before</option>
                    <option value="3-days">3 days before</option>
                    <option value="1-day">1 day before</option>
                    <option value="12-hours">12 hours before</option>
                  </select>
                </div>

                <div>
                  <p className="text-sm text-gray-700 mb-2">Second Reminder</p>
                  <select 
                    className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                    value={appointmentReminders.secondReminder}
                    onChange={(e) => setAppointmentReminders({ ...appointmentReminders, secondReminder: e.target.value })}
                  >
                    <option value="6-hours">6 hours before</option>
                    <option value="3-hours">3 hours before</option>
                    <option value="2-hours">2 hours before</option>
                    <option value="1-hour">1 hour before</option>
                    <option value="30-minutes">30 minutes before</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lab Results Available */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('lab-results')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="text-gray-900">Lab Results Available</h3>
                <p className="text-sm text-gray-500">Notify immediately</p>
              </div>
            </div>
            {expandedSections.includes('lab-results') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('lab-results') && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              {renderChannelToggles(labResults, setLabResults, ['email', 'sms', 'push'])}
              <div className="mt-4">
                <p className="text-sm text-gray-700 mb-2">Notification Timing</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="lab-timing"
                      checked={labResults.notifyType === 'immediate'}
                      onChange={() => setLabResults({ ...labResults, notifyType: 'immediate' })}
                      className="text-teal-600"
                    />
                    <span className="text-gray-900">Notify me immediately</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="lab-timing"
                      checked={labResults.notifyType === 'digest'}
                      onChange={() => setLabResults({ ...labResults, notifyType: 'digest' })}
                      className="text-teal-600"
                    />
                    <span className="text-gray-900">Daily digest</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Medication Refill Reminders */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('medication-refill')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="text-gray-900">Medication Refill Reminders</h3>
                <p className="text-sm text-gray-500">7 days before running out</p>
              </div>
            </div>
            {expandedSections.includes('medication-refill') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('medication-refill') && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <p className="text-gray-900">Push Notification</p>
                </div>
                <Switch
                  checked={medicationRefill.push}
                  onCheckedChange={(checked) => setMedicationRefill({ ...medicationRefill, push: checked })}
                />
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-700 mb-2">When to notify</p>
                  <select 
                    className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                    value={medicationRefill.daysBeforeNotify}
                    onChange={(e) => setMedicationRefill({ ...medicationRefill, daysBeforeNotify: Number(e.target.value) })}
                  >
                    <option value={3}>3 days before</option>
                    <option value={7}>7 days before</option>
                    <option value={14}>14 days before</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-gray-900">Auto-request refill</p>
                    <p className="text-sm text-gray-500">Automatically send refill request</p>
                  </div>
                  <Switch
                    checked={medicationRefill.autoRequest}
                    onCheckedChange={(checked) => setMedicationRefill({ ...medicationRefill, autoRequest: checked })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Replies from Providers */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('provider-messages')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <h3 className="text-gray-900">Message Replies from Providers</h3>
                <p className="text-sm text-gray-500">Email & Push</p>
              </div>
            </div>
            {expandedSections.includes('provider-messages') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('provider-messages') && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              {renderChannelToggles(providerMessages, setProviderMessages, ['email', 'push', 'sms'])}
            </div>
          )}
        </div>

        {/* Health Tasks & To-Dos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('health-tasks')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-left">
                <h3 className="text-gray-900">Health Tasks & To-Dos</h3>
                <p className="text-sm text-gray-500">Push + Weekly email</p>
              </div>
            </div>
            {expandedSections.includes('health-tasks') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('health-tasks') && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <p className="text-gray-900">Push Notification</p>
                </div>
                <Switch
                  checked={healthTasks.push}
                  onCheckedChange={(checked) => setHealthTasks({ ...healthTasks, push: checked })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <p className="text-gray-900">SMS</p>
                </div>
                <Switch
                  checked={healthTasks.sms}
                  onCheckedChange={(checked) => setHealthTasks({ ...healthTasks, sms: checked })}
                />
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-700 mb-2">Email Digest</p>
                <select 
                  className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                  value={healthTasks.emailDigest}
                  onChange={(e) => setHealthTasks({ ...healthTasks, emailDigest: e.target.value })}
                >
                  <option value="none">None</option>
                  <option value="daily">Daily summary</option>
                  <option value="weekly">Weekly summary</option>
                  <option value="monthly">Monthly summary</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Preventive Care Reminders */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('preventive-care')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-pink-600" />
              </div>
              <div className="text-left">
                <h3 className="text-gray-900">Preventive Care Reminders</h3>
                <p className="text-sm text-gray-500">Monthly email</p>
              </div>
            </div>
            {expandedSections.includes('preventive-care') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('preventive-care') && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              <div>
                <p className="text-sm text-gray-700 mb-2">Email Frequency</p>
                <select 
                  className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                  value={preventiveCare.email}
                  onChange={(e) => setPreventiveCare({ ...preventiveCare, email: e.target.value })}
                >
                  <option value="none">Don't remind me</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <p className="text-gray-900">Push Notification</p>
                </div>
                <Switch
                  checked={preventiveCare.push}
                  onCheckedChange={(checked) => setPreventiveCare({ ...preventiveCare, push: checked })}
                />
              </div>
            </div>
          )}
        </div>

        {/* System Updates & Features */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('system-updates')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="text-gray-900">System Updates & Features</h3>
                <p className="text-sm text-gray-500">Opted out of marketing</p>
              </div>
            </div>
            {expandedSections.includes('system-updates') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('system-updates') && (
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              {renderChannelToggles(systemUpdates, setSystemUpdates, ['email', 'push'])}
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
                <div>
                  <p className="text-gray-900">Opt out of marketing</p>
                  <p className="text-sm text-gray-500">Only receive essential updates</p>
                </div>
                <Switch
                  checked={systemUpdates.optOutMarketing}
                  onCheckedChange={(checked) => setSystemUpdates({ ...systemUpdates, optOutMarketing: checked })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Emergency Alerts */}
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 mb-1">Emergency Alerts</h3>
              <p className="text-sm text-gray-500 mb-3">Critical safety notifications (cannot be disabled)</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-900">SMS</span>
                  </div>
                  <Badge className="bg-red-100 text-red-700 border-0">Required</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-900">Phone Call</span>
                  </div>
                  <Badge className="bg-red-100 text-red-700 border-0">Required</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                <div>
                  <p className="text-gray-900">Allow during quiet hours</p>
                  <p className="text-sm text-gray-500">Emergency alerts override quiet mode</p>
                </div>
                <Switch
                  checked={allowEmergencyDuringQuiet}
                  onCheckedChange={(checked) => setAllowEmergencyDuringQuiet(checked)}
                />
              </div>

              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Example: "Urgent safety recall on your medication"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preferred Contact Method */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-gray-900">Preferred Contact Method</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">Primary Method</p>
              <select 
                className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                value={preferredContact.primary}
                onChange={(e) => setPreferredContact({ ...preferredContact, primary: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <div>
              <p className="text-sm text-gray-700 mb-2">Secondary Method</p>
              <select 
                className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                value={preferredContact.secondary}
                onChange={(e) => setPreferredContact({ ...preferredContact, secondary: e.target.value })}
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <div>
              <p className="text-sm text-gray-700 mb-2">Best Time to Call</p>
              <select 
                className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                value={preferredContact.bestTimeToCall}
                onChange={(e) => setPreferredContact({ ...preferredContact, bestTimeToCall: e.target.value })}
              >
                <option value="weekdays-9am-5pm">Weekdays 9am-5pm</option>
                <option value="weekdays-5pm-9pm">Weekdays 5pm-9pm</option>
                <option value="weekends">Weekends</option>
                <option value="anytime">Anytime</option>
              </select>
            </div>

            <div>
              <p className="text-sm text-gray-700 mb-2">Language Preference</p>
              <select 
                className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                value={preferredContact.language}
                onChange={(e) => setPreferredContact({ ...preferredContact, language: e.target.value })}
              >
                <option value="english">English</option>
                <option value="french">Français</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pb-4">
          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}