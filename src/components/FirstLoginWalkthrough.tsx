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
    <div className="fixed inset-x-0 top-4 z-[200] flex justify-center px-4">
      <div className="relative w-full max-w-[360px]">
        <div className="absolute left-10 top-0 h-4 w-4 -translate-y-1/2 rotate-45 rounded-[4px] bg-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.24)]" />
        <div className="relative overflow-hidden rounded-[26px] bg-slate-900 text-white shadow-[0_24px_70px_rgba(15,23,42,0.32)]">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300">
              <Sparkles className="h-4 w-4" />
              <span>{stepLabel}</span>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Skip walkthrough"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-5 pb-5 pt-3">
            <div className="space-y-2">
              <h2 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] text-white">
                {title}
              </h2>
              <p className="text-base leading-7 text-white/80">{description}</p>
            </div>

            {!isPrompt && (
              <div className="flex items-center justify-between text-sm font-medium text-white/65">
                <span>
                  {currentStep} of {totalSteps}
                </span>
                <span>
                  Tour
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-12 min-w-[104px] items-center justify-center rounded-full border border-white/18 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/16"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                className="inline-flex h-12 min-w-[112px] items-center justify-center rounded-full bg-blue-500 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(59,130,246,0.35)] transition hover:bg-blue-400"
              >
                {nextLabel}
              </button>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="w-full text-center text-sm font-medium text-white/65 transition hover:text-white"
            >
              {isPrompt ? 'Maybe later' : 'Skip tour'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
