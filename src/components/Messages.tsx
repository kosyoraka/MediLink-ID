import { useState } from 'react';
import { Search, Plus, ArrowLeft, Send, Paperclip, Building2, ChevronRight } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

interface Conversation {
  id: string;
  provider: string;
  logo: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    provider: 'Dr. Sarah Johnson',
    logo: '',
    lastMessage: 'Your lab results are ready to review',
    timestamp: '2h ago',
    unread: 1,
  },
  {
    id: '2',
    provider: 'Sunnybrook Hospital',
    logo: '',
    lastMessage: 'Appointment reminder for tomorrow',
    timestamp: 'Yesterday',
    unread: 0,
  },
  {
    id: '3',
    provider: 'LifeLabs',
    logo: '',
    lastMessage: 'Thank you for visiting LifeLabs',
    timestamp: 'Nov 15',
    unread: 0,
  },
];

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [message, setMessage] = useState('');

  if (showNewMessage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setShowNewMessage(false)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-gray-900">New Message</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Select Provider</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg">
              <option>Dr. Sarah Johnson - Family Medicine</option>
              <option>Sunnybrook Hospital</option>
              <option>LifeLabs</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Subject</label>
            <Input placeholder="Enter subject" />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Message Type</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg">
              <option>General question</option>
              <option>Prescription refill</option>
              <option>Test results question</option>
              <option>Appointment request</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Message</label>
            <Textarea
              placeholder="Type your message here..."
              className="min-h-32"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button variant="outline" className="w-full">
            <Paperclip className="w-4 h-4 mr-2" />
            Attach File
          </Button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="text-gray-900">Typical response time:</span> 1-2 business days
            </p>
          </div>

          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            Send Message
          </Button>
        </div>
      </div>
    );
  }

  if (selectedConversation) {
    const conversation = mockConversations.find(c => c.id === selectedConversation);
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedConversation(null)} className="text-gray-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-gray-900">{conversation?.provider}</h2>
              <p className="text-xs text-gray-500">Typical response: 1-2 business days</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-sm p-4 max-w-xs shadow-sm border border-gray-200">
              <p className="text-gray-800">Your lab results are ready to review. Please check your medical records for details.</p>
              <p className="text-xs text-gray-500 mt-2">2 hours ago</p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-teal-600 text-white rounded-2xl rounded-tr-sm p-4 max-w-xs">
              <p>Thank you! I'll review them now.</p>
              <p className="text-xs text-teal-100 mt-2">1 hour ago</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <button className="text-gray-400 hover:text-gray-600">
              <Paperclip className="w-5 h-5" />
            </button>
            <Input
              placeholder="Type a message..."
              className="flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-900">Messages</h1>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowNewMessage(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search messages..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {mockConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => setSelectedConversation(conversation.id)}
            className="w-full bg-white hover:bg-gray-50 p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-gray-900">{conversation.provider}</h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{conversation.timestamp}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                  {conversation.unread > 0 && (
                    <Badge className="bg-teal-600 text-white border-0">{conversation.unread}</Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {mockConversations.length === 0 && (
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 mb-4">No messages yet</p>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowNewMessage(true)}
          >
            Send Your First Message
          </Button>
        </div>
      )}
    </div>
  );
}
