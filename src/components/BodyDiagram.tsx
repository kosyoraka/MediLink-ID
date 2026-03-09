import { useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface BodyPart {
  id: string;
  label: string;
  path: string;
  view: "front" | "back";
  region: "upper" | "lower";
}

interface BodyDiagramProps {
  selectedParts: string[];
  onPartSelect: (parts: string[]) => void;
}

export default function BodyDiagram({ selectedParts, onPartSelect }: BodyDiagramProps) {
  const [view, setView] = useState<"front" | "back">("front");

  const toggleBodyPart = (partId: string) => {
    if (selectedParts.includes(partId)) {
      onPartSelect(selectedParts.filter((p) => p !== partId));
    } else {
      onPartSelect([...selectedParts, partId]);
    }
  };

  const bodyParts: BodyPart[] = useMemo(
    () => [
      // FRONT — Upper
      { id: "head", label: "Head", view: "front", region: "upper", path: "M150 20 C150 20, 120 25, 120 50 L120 65 C120 75, 130 80, 150 80 C170 80, 180 75, 180 65 L180 50 C180 25, 150 20, 150 20 Z" },
      { id: "face", label: "Face", view: "front", region: "upper", path: "M130 45 C130 45, 130 65, 150 70 C170 65, 170 45, 170 45 C170 35, 160 30, 150 30 C140 30, 130 35, 130 45 Z" },
      { id: "neck", label: "Neck", view: "front", region: "upper", path: "M140 80 L160 80 L158 100 L142 100 Z" },
      { id: "left-shoulder", label: "Left Shoulder", view: "front", region: "upper", path: "M100 100 L115 100 L118 120 L100 125 Z" },
      { id: "right-shoulder", label: "Right Shoulder", view: "front", region: "upper", path: "M185 100 L200 100 L200 125 L182 120 Z" },
      { id: "chest", label: "Chest", view: "front", region: "upper", path: "M115 100 L185 100 L185 140 L115 140 Z" },
      { id: "upper-abdomen", label: "Upper Abdomen", view: "front", region: "upper", path: "M120 140 L180 140 L180 175 L120 175 Z" },
      { id: "left-upper-arm", label: "Left Upper Arm", view: "front", region: "upper", path: "M95 125 L118 120 L120 165 L95 170 Z" },
      { id: "right-upper-arm", label: "Right Upper Arm", view: "front", region: "upper", path: "M182 120 L205 125 L205 170 L180 165 Z" },
      { id: "left-elbow", label: "Left Elbow", view: "front", region: "upper", path: "M95 170 L120 165 L120 180 L92 185 Z" },
      { id: "right-elbow", label: "Right Elbow", view: "front", region: "upper", path: "M180 165 L205 170 L208 185 L180 180 Z" },
      { id: "left-forearm", label: "Left Forearm", view: "front", region: "upper", path: "M92 185 L120 180 L118 235 L88 240 Z" },
      { id: "right-forearm", label: "Right Forearm", view: "front", region: "upper", path: "M180 180 L208 185 L212 240 L182 235 Z" },
      { id: "left-hand", label: "Left Hand", view: "front", region: "upper", path: "M83 240 L88 240 L118 235 L118 260 L80 263 Z" },
      { id: "right-hand", label: "Right Hand", view: "front", region: "upper", path: "M182 235 L212 240 L220 263 L182 260 Z" },

      // FRONT — Lower
      { id: "lower-abdomen", label: "Lower Abdomen", view: "front", region: "lower", path: "M120 175 L180 175 L178 210 L122 210 Z" },
      { id: "pelvis", label: "Pelvis / Groin", view: "front", region: "lower", path: "M122 210 L178 210 L175 245 L125 245 Z" },
      { id: "left-hip", label: "Left Hip", view: "front", region: "lower", path: "M122 210 L145 210 L145 250 L118 250 Z" },
      { id: "right-hip", label: "Right Hip", view: "front", region: "lower", path: "M155 210 L178 210 L182 250 L155 250 Z" },
      { id: "left-thigh", label: "Left Thigh", view: "front", region: "lower", path: "M118 250 L145 250 L145 335 L113 335 Z" },
      { id: "right-thigh", label: "Right Thigh", view: "front", region: "lower", path: "M155 250 L182 250 L187 335 L155 335 Z" },
      { id: "left-knee", label: "Left Knee", view: "front", region: "lower", path: "M113 335 L145 335 L145 360 L113 360 Z" },
      { id: "right-knee", label: "Right Knee", view: "front", region: "lower", path: "M155 335 L187 335 L187 360 L155 360 Z" },
      { id: "left-calf", label: "Left Calf", view: "front", region: "lower", path: "M115 360 L145 360 L142 425 L112 425 Z" },
      { id: "right-calf", label: "Right Calf", view: "front", region: "lower", path: "M155 360 L185 360 L188 425 L158 425 Z" },
      { id: "left-foot", label: "Left Foot", view: "front", region: "lower", path: "M107 425 L142 425 L145 445 L97 445 Z" },
      { id: "right-foot", label: "Right Foot", view: "front", region: "lower", path: "M158 425 L188 425 L203 445 L153 445 Z" },

      // BACK — Upper
      { id: "back-head", label: "Back of Head", view: "back", region: "upper", path: "M150 20 C150 20, 120 25, 120 50 L120 65 C120 75, 130 80, 150 80 C170 80, 180 75, 180 65 L180 50 C180 25, 150 20, 150 20 Z" },
      { id: "back-neck", label: "Neck (Back)", view: "back", region: "upper", path: "M140 80 L160 80 L158 100 L142 100 Z" },
      { id: "left-shoulder-blade", label: "Left Shoulder Blade", view: "back", region: "upper", path: "M115 105 L135 105 L135 135 L115 135 Z" },
      { id: "right-shoulder-blade", label: "Right Shoulder Blade", view: "back", region: "upper", path: "M165 105 L185 105 L185 135 L165 135 Z" },
      { id: "upper-back", label: "Upper Back", view: "back", region: "upper", path: "M115 100 L185 100 L185 140 L115 140 Z" },
      { id: "mid-back", label: "Mid Back", view: "back", region: "upper", path: "M120 140 L180 140 L180 180 L120 180 Z" },
      { id: "left-upper-arm-back", label: "Left Upper Arm", view: "back", region: "upper", path: "M95 125 L115 120 L118 165 L95 170 Z" },
      { id: "right-upper-arm-back", label: "Right Upper Arm", view: "back", region: "upper", path: "M185 120 L205 125 L205 170 L182 165 Z" },
      { id: "left-elbow-back", label: "Left Elbow", view: "back", region: "upper", path: "M95 170 L118 165 L118 185 L92 190 Z" },
      { id: "right-elbow-back", label: "Right Elbow", view: "back", region: "upper", path: "M182 165 L205 170 L208 190 L182 185 Z" },
      { id: "left-forearm-back", label: "Left Forearm", view: "back", region: "upper", path: "M92 190 L118 185 L118 235 L88 240 Z" },
      { id: "right-forearm-back", label: "Right Forearm", view: "back", region: "upper", path: "M182 185 L208 190 L212 240 L182 235 Z" },
      { id: "left-hand-back", label: "Left Hand", view: "back", region: "upper", path: "M83 240 L88 240 L118 235 L118 260 L80 263 Z" },
      { id: "right-hand-back", label: "Right Hand", view: "back", region: "upper", path: "M182 235 L212 240 L220 263 L182 260 Z" },

      // BACK — Lower
      { id: "lower-back", label: "Lower Back", view: "back", region: "lower", path: "M120 180 L180 180 L180 230 L120 230 Z" },
      { id: "left-glute", label: "Left Glute", view: "back", region: "lower", path: "M120 230 L148 230 L148 270 L118 270 Z" },
      { id: "right-glute", label: "Right Glute", view: "back", region: "lower", path: "M152 230 L180 230 L182 270 L152 270 Z" },
      { id: "left-thigh-back", label: "Left Thigh", view: "back", region: "lower", path: "M118 270 L148 270 L145 335 L113 335 Z" },
      { id: "right-thigh-back", label: "Right Thigh", view: "back", region: "lower", path: "M152 270 L182 270 L187 335 L155 335 Z" },
      { id: "left-knee-back", label: "Left Knee", view: "back", region: "lower", path: "M113 335 L145 335 L145 360 L113 360 Z" },
      { id: "right-knee-back", label: "Right Knee", view: "back", region: "lower", path: "M155 335 L187 335 L187 360 L155 360 Z" },
      { id: "left-calf-back", label: "Left Calf", view: "back", region: "lower", path: "M115 360 L145 360 L142 425 L112 425 Z" },
      { id: "right-calf-back", label: "Right Calf", view: "back", region: "lower", path: "M155 360 L185 360 L188 425 L158 425 Z" },
      { id: "left-foot-back", label: "Left Foot", view: "back", region: "lower", path: "M107 425 L142 425 L145 445 L97 445 Z" },
      { id: "right-foot-back", label: "Right Foot", view: "back", region: "lower", path: "M158 425 L188 425 L203 445 L153 445 Z" },
    ],
    []
  );

  const currentBodyParts = bodyParts.filter((part) => part.view === view);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-gray-900 mb-3">Where does it hurt?</h3>
      <p className="text-sm text-gray-600 mb-4">
        Select the view and tap the areas where you&apos;re experiencing symptoms
      </p>

      <Tabs value={view} onValueChange={(v) => setView(v as "front" | "back")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="front">Front View</TabsTrigger>
          <TabsTrigger value="back">Back View</TabsTrigger>
        </TabsList>

        <TabsContent value="front" className="mt-0">
          <div className="flex justify-center">
            <svg viewBox="0 0 300 470" className="w-full max-w-xs h-auto" style={{ maxHeight: "500px" }}>
              {/* Body outline */}
              <g opacity="0.2">
                <path
                  d="M150 20 C150 20, 120 25, 120 50 L120 70 C120 80, 130 85, 150 85 C170 85, 180 80, 180 70 L180 50 C180 25, 150 20, 150 20 Z"
                  fill="#e5e7eb"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <path
                  d="M135 85 L165 85 L160 105 L140 105 Z"
                  fill="#e5e7eb"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <path
                  d="M105 105 L195 105 L195 220 L115 220 L115 255 L145 255 L145 340 L110 340 L110 365 L115 365 L115 430 L105 430 L105 450 L145 450 L145 430 L140 430 L145 365 L145 340 L145 255 L155 255 L155 340 L155 365 L160 430 L155 450 L205 450 L190 430 L185 365 L190 340 L185 255 L185 220 L195 220 L195 105 L205 105 L210 135 L210 185 L215 245 L220 268 L185 265 L185 240 L185 180 L190 130 L195 105 M105 105 L95 105 L95 135 L90 185 L85 245 L80 268 L115 265 L115 240 L115 180 L110 130 L105 105"
                  fill="#e5e7eb"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
              </g>

              {/* Clickable parts */}
              {currentBodyParts.map((part) => (
                <path
                  key={part.id}
                  d={part.path}
                  fill={selectedParts.includes(part.id) ? "#ef4444" : "transparent"}
                  stroke={selectedParts.includes(part.id) ? "#dc2626" : "#d1d5db"}
                  strokeWidth="2"
                  className="cursor-pointer transition-all hover:fill-red-200 hover:stroke-red-400"
                  onClick={() => toggleBodyPart(part.id)}
                />
              ))}
            </svg>
          </div>
        </TabsContent>

        <TabsContent value="back" className="mt-0">
          <div className="flex justify-center">
            <svg viewBox="0 0 300 470" className="w-full max-w-xs h-auto" style={{ maxHeight: "500px" }}>
              {/* Body outline */}
              <g opacity="0.2">
                <path
                  d="M150 20 C150 20, 120 25, 120 50 L120 70 C120 80, 130 85, 150 85 C170 85, 180 80, 180 70 L180 50 C180 25, 150 20, 150 20 Z"
                  fill="#e5e7eb"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <path
                  d="M135 85 L165 85 L160 105 L140 105 Z"
                  fill="#e5e7eb"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <path
                  d="M105 105 L195 105 L195 220 L185 220 L185 270 L185 340 L190 340 L190 365 L190 430 L205 450 L155 450 L160 430 L155 365 L155 340 L155 270 L155 255 L145 255 L145 270 L145 340 L145 365 L145 430 L145 450 L95 450 L110 430 L115 365 L110 340 L115 270 L115 220 L105 220 L105 105 L95 105 L95 135 L90 185 L90 200 L85 245 L80 268 L115 265 L115 240 L115 195 L115 180 L110 130 L105 105 M195 105 L205 105 L205 135 L210 185 L210 200 L215 245 L220 268 L185 265 L185 240 L185 195 L185 180 L190 130 L195 105"
                  fill="#e5e7eb"
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
              </g>

              {/* Clickable parts */}
              {currentBodyParts.map((part) => (
                <path
                  key={part.id}
                  d={part.path}
                  fill={selectedParts.includes(part.id) ? "#ef4444" : "transparent"}
                  stroke={selectedParts.includes(part.id) ? "#dc2626" : "#d1d5db"}
                  strokeWidth="2"
                  className="cursor-pointer transition-all hover:fill-red-200 hover:stroke-red-400"
                  onClick={() => toggleBodyPart(part.id)}
                />
              ))}
            </svg>
          </div>
        </TabsContent>
      </Tabs>

      {/* Selected parts */}
      {selectedParts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Selected areas:</p>
          <div className="flex flex-wrap gap-2">
            {selectedParts.map((id) => {
              const part = bodyParts.find((p) => p.id === id);
              if (!part) return null;
              return (
                <Badge
                  key={id}
                  className="bg-red-100 text-red-700 border-0 cursor-pointer hover:bg-red-200"
                  onClick={() => toggleBodyPart(id)}
                  title="Click to remove"
                >
                  {part.label} ✕
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
