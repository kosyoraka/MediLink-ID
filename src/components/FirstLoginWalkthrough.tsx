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

const bubbleStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: '340px',
  backgroundColor: '#252a31',
  color: '#ffffff',
  borderRadius: '28px',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.38)',
  pointerEvents: 'auto',
};

const actionButtonBase: React.CSSProperties = {
  height: '40px',
  padding: '0 16px',
  borderRadius: '9999px',
  fontSize: '16px',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

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
    <div
      style={{
        position: 'fixed',
        inset: '16px 0 auto 0',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '340px', pointerEvents: 'auto' }}>
        <div
          style={{
            position: 'absolute',
            left: '54px',
            top: 0,
            width: '18px',
            height: '18px',
            backgroundColor: '#252a31',
            transform: 'translateY(-45%) rotate(45deg)',
            borderRadius: '4px',
          }}
        />

        <div style={bubbleStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '20px 20px 0 20px',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#7dd3fc', fontSize: '14px', fontWeight: 700 }}>
              <Sparkles size={16} />
              <span>{stepLabel}</span>
            </div>

            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip walkthrough"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.72)',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ padding: '8px 20px 20px 20px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '24px',
                lineHeight: 1.2,
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h2>

            <p
              style={{
                margin: '12px 0 0 0',
                fontSize: '16px',
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.84)',
              }}
            >
              {description}
            </p>

            {!isPrompt ? (
              <div
                style={{
                  marginTop: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.70)',
                }}
              >
                <span>{currentStep} of {totalSteps}</span>
                <span>Tour</span>
              </div>
            ) : null}

            <div
              style={{
                marginTop: '18px',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    ...actionButtonBase,
                    minWidth: '78px',
                    backgroundColor: '#3b4450',
                    color: '#ffffff',
                  }}
                >
                  Back
                </button>
              ) : null}

              <button
                type="button"
                onClick={onNext}
                style={{
                  ...actionButtonBase,
                  minWidth: '88px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  boxShadow: '0 10px 24px rgba(37, 99, 235, 0.34)',
                }}
              >
                {nextLabel}
              </button>
            </div>

            <button
              type="button"
              onClick={onSkip}
              style={{
                marginTop: '14px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.72)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {isPrompt ? 'Maybe later' : 'Skip tour'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
