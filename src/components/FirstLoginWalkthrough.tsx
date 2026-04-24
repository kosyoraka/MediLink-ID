import { Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';

interface FirstLoginWalkthroughProps {
  stepLabel: string;
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext: () => void;
  onSkip: () => void;
  nextLabel?: string;
  tone?: 'tour' | 'prompt';
}

export default function FirstLoginWalkthrough({
  stepLabel,
  title,
  description,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Next',
  tone = 'tour',
}: FirstLoginWalkthroughProps) {
  const isPrompt = tone === 'prompt';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-3">
      <div className="pointer-events-auto relative w-full max-w-md px-1">
        <div className="mx-auto h-4 w-4 rotate-45 rounded-[4px] border-l border-t border-slate-200 bg-white shadow-sm" />
        <div className="-mt-2 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
                  <Sparkles className="h-4 w-4" />
                  <span>{stepLabel}</span>
                </div>
                <h2 className="text-2xl font-semibold leading-tight">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Skip walkthrough"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <p className="text-base leading-7 text-slate-700">{description}</p>

            {!isPrompt && (
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
                <span>{stepLabel}</span>
                <span>
                  {currentStep} of {totalSteps}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              {onBack ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  Back
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={onNext}
                className="flex-1 rounded-full bg-slate-900 text-white hover:bg-slate-800"
              >
                {nextLabel}
              </Button>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="w-full text-center text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              {isPrompt ? 'Maybe later' : 'Skip tour'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
