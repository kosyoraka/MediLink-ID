import { useState } from 'react';
import { ArrowLeft, Clock, AlertCircle, Calendar, TestTube, Pill, FileText, Activity, ChevronRight, X, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface HealthTasksProps {
  onBack: () => void;
}

type TaskTab = 'all' | 'urgent' | 'this-week' | 'upcoming';

interface Task {
  id: string;
  category: 'appointment' | 'test' | 'medication' | 'document' | 'preventive' | 'followup';
  title: string;
  description: string;
  dueDate: string;
  priority: 'urgent' | 'soon' | 'routine';
  provider?: string;
  estimatedTime: string;
  overdue?: boolean;
}

const mockTasks: Task[] = [
  {
    id: '1',
    category: 'appointment',
    title: 'Complete Annual Physical',
    description: 'Schedule your yearly checkup with Dr. Johnson',
    dueDate: 'Dec 1, 2025',
    priority: 'soon',
    provider: 'Dr. Sarah Johnson',
    estimatedTime: '5 minutes',
  },
  {
    id: '2',
    category: 'test',
    title: 'Schedule Mammogram',
    description: 'Routine breast cancer screening',
    dueDate: 'Sep 15, 2025',
    priority: 'urgent',
    provider: 'Mount Sinai Hospital',
    estimatedTime: '10 minutes',
    overdue: true,
  },
  {
    id: '3',
    category: 'followup',
    title: 'Review new lab results',
    description: 'Check your recent blood work from LifeLabs',
    dueDate: 'Nov 15, 2025',
    priority: 'routine',
    provider: 'LifeLabs',
    estimatedTime: '3 minutes',
  },
  {
    id: '4',
    category: 'medication',
    title: 'Refill prescription',
    description: 'Lisinopril - 3 days remaining',
    dueDate: 'Nov 21, 2025',
    priority: 'urgent',
    provider: 'Shoppers Drug Mart',
    estimatedTime: '2 minutes',
  },
  {
    id: '5',
    category: 'document',
    title: 'Sign consent form',
    description: 'Consent for upcoming procedure',
    dueDate: 'Nov 25, 2025',
    priority: 'soon',
    provider: 'Sunnybrook Hospital',
    estimatedTime: '5 minutes',
  },
  {
    id: '6',
    category: 'preventive',
    title: 'Schedule Flu Shot',
    description: 'Annual influenza vaccine',
    dueDate: 'Dec 31, 2025',
    priority: 'routine',
    estimatedTime: '5 minutes',
  },
  {
    id: '7',
    category: 'test',
    title: 'Complete blood work',
    description: 'Fasting glucose test needed',
    dueDate: 'Nov 30, 2025',
    priority: 'soon',
    provider: 'LifeLabs',
    estimatedTime: '10 minutes',
  },
];

export default function HealthTasks({ onBack }: HealthTasksProps) {
  const [activeTab, setActiveTab] = useState<TaskTab>('all');
  const [tasks, setTasks] = useState(mockTasks);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointment': return Calendar;
      case 'test': return TestTube;
      case 'medication': return Pill;
      case 'document': return FileText;
      case 'preventive': return Activity;
      case 'followup': return Activity;
      default: return Activity;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'appointment': return 'bg-blue-100 text-blue-600';
      case 'test': return 'bg-green-100 text-green-600';
      case 'medication': return 'bg-purple-100 text-purple-600';
      case 'document': return 'bg-orange-100 text-orange-600';
      case 'preventive': return 'bg-teal-100 text-teal-600';
      case 'followup': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleDismiss = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const urgentCount = tasks.filter(t => t.priority === 'urgent').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-gray-900">Health To-Dos</h1>
            <p className="text-sm text-gray-600">{tasks.length} tasks</p>
          </div>
          <Badge className="bg-red-100 text-red-700 border-0">{urgentCount} Urgent</Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'urgent', label: 'Urgent' },
            { key: 'this-week', label: 'This Week' },
            { key: 'upcoming', label: 'Upcoming' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TaskTab)}
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
        {tasks
          .filter(task => {
            if (activeTab === 'urgent') return task.priority === 'urgent';
            if (activeTab === 'this-week') return task.priority === 'urgent' || task.priority === 'soon';
            return true;
          })
          .map((task) => {
            const Icon = getCategoryIcon(task.category);
            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border-2 ${
                  task.priority === 'urgent' ? 'border-red-200' : 'border-gray-200'
                } p-4`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {/* Priority indicator */}
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'soon' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`} />
                  
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full ${getCategoryColor(task.category)} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {task.overdue ? (
                        <Badge className="bg-red-100 text-red-700 border-0">
                          Overdue by 2 months
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {task.dueDate}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{task.estimatedTime}</span>
                      </div>
                    </div>

                    {task.provider && (
                      <p className="text-sm text-gray-500">{task.provider}</p>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismiss(task.id)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                    Do This Now
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button size="sm" variant="outline" className="flex-shrink-0">
                    <Bell className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-900 mb-2">All caught up!</p>
            <p className="text-gray-500">You have no pending health tasks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
