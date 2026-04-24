import { Sparkles, X } from 'lucide-react';
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
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-4">
      <div className="pointer-events-auto relative w-full max-w-md">
        <div className="mx-auto h-4 w-4 rotate-45 rounded-[5px] border border-slate-200/80 bg-white/92 shadow-sm backdrop-blur-sm" />
        <div className="-mt-2 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-md">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700">
              <Sparkles className="h-4 w-4" />
              <span>{stepLabel}</span>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Skip walkthrough"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-5 pb-5 pt-3">
            <div className="space-y-2">
              <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-slate-900">
                {title}
              </h2>
              <p className="text-base leading-7 text-slate-600">{description}</p>
            </div>

            {!isPrompt && (
              <div className="flex items-center justify-between text-sm font-medium text-slate-500">
                <span>{stepLabel}</span>
                <span>
                  {currentStep} of {totalSteps}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-11 min-w-[112px] items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
              >
                {nextLabel}
              </button>
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
