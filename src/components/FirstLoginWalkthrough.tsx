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
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-3">
      <div className="pointer-events-auto relative w-full max-w-md px-1">
        <div className="mx-auto h-4 w-4 rotate-45 rounded-[5px] border border-white/40 bg-white/75 shadow-sm backdrop-blur-md" />
        <div className="-mt-2 overflow-hidden rounded-[32px] border border-white/45 bg-white/78 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
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

            <div className="flex items-center gap-3 pt-1">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-slate-300 bg-white/90 px-5 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-white"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                onClick={onNext}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-slate-900 px-5 text-base font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.22)] transition hover:bg-slate-800"
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
