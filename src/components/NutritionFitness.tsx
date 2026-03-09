import { ArrowLeft, Flame, Apple, Dumbbell, Droplets, Moon, Footprints } from "lucide-react";
import { Button } from "./ui/button";

interface NutritionFitnessProps {
  onBack: () => void;
}

const dailyGoals = [
  { label: "Calories", value: "1,780 / 2,100 kcal", icon: Flame, color: "text-orange-600 bg-orange-100" },
  { label: "Water", value: "1.8 / 2.5 L", icon: Droplets, color: "text-blue-600 bg-blue-100" },
  { label: "Protein", value: "72 / 100 g", icon: Apple, color: "text-green-600 bg-green-100" },
  { label: "Sleep", value: "6.9 / 8 h", icon: Moon, color: "text-indigo-600 bg-indigo-100" },
];

const fitnessSummary = [
  { label: "Steps", value: "7,240", icon: Footprints, trend: "+12% vs yesterday" },
  { label: "Workout", value: "38 min", icon: Dumbbell, trend: "Strength training" },
];

export default function NutritionFitness({ onBack }: NutritionFitnessProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Nutrition & Fitness</h1>
        </div>
        <p className="text-emerald-100">Track your daily wellness goals and activity trends.</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {dailyGoals.map((goal) => {
            const Icon = goal.icon;
            return (
              <div key={goal.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${goal.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-600">{goal.label}</p>
                <p className="text-sm text-gray-900">{goal.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-gray-900 mb-3">Today</h2>
          <div className="space-y-3">
            {fitnessSummary.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.trend}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-900">{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-4">
          <p className="text-sm text-gray-700 mb-3">
            Next step: connect Apple Health, Fitbit, or Garmin to sync real activity and nutrition data.
          </p>
          <Button variant="outline" className="w-full">
            Connect Data Source
          </Button>
        </div>
      </div>
    </div>
  );
}
