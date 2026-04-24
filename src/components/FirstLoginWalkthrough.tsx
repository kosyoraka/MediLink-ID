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
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 px-4 pb-6 pt-16">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90">
                <Sparkles className="h-4 w-4" />
                <span>{stepLabel}</span>
              </div>
              <h2 className="text-xl font-semibold">{title}</h2>
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
          <p className="text-sm leading-6 text-slate-600">{description}</p>

          {!isPrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                <span>Progress</span>
                <span>
                  {currentStep}/{totalSteps}
                </span>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 flex-1 rounded-full ${
                      index < currentStep ? 'bg-teal-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {onBack ? (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 rounded-full border-slate-200 text-slate-700"
              >
                Back
              </Button>
            ) : null}
            <Button
              type="button"
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
  );
}
