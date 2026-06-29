'use client';

import { useEffect, useState } from 'react';
import { useLang } from './LangProvider';

interface StepState { status: 'pending' | 'running' | 'done' | 'error'; message: string; }

const DUB_STEPS = ['download', 'extract_audio', 'transcribe', 'translate', 'tts', 'timing', 'mux'];
const SUB_STEPS = ['download', 'extract_audio', 'transcribe', 'translate', 'subtitle_burn'];

interface Props { jobId: string; onComplete: () => void; onError: (msg: string) => void; onCancel: () => void; mode?: 'dub' | 'subtitle'; }

export default function ProgressDisplay({ jobId, onComplete, onError, onCancel, mode = 'dub' }: Props) {
  const { tr } = useLang();
  const stepKeys = mode === 'subtitle' ? SUB_STEPS : DUB_STEPS;
  const [steps, setSteps] = useState<Record<string, StepState>>(() =>
    Object.fromEntries(stepKeys.map(k => [k, { status: 'pending', message: '' }]))
  );

  useEffect(() => {
    const es = new EventSource(`/api/progress/${jobId}`);
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data) as { step: string; status?: string; message?: string };
      if (ev.step === 'complete') { es.close(); onComplete(); return; }
      if (ev.step === 'error')   { es.close(); onError(ev.message ?? 'Unknown error'); return; }
      setSteps(prev => ({ ...prev, [ev.step]: { status: (ev.status as StepState['status']) ?? 'running', message: ev.message ?? '' } }));
    };
    es.onerror = () => { es.close(); onError(tr.connectionLost); };
    return () => es.close();
  }, [jobId, onComplete, onError]);

  const doneCount = Object.values(steps).filter(s => s.status === 'done').length;
  const progress = Math.round((doneCount / stepKeys.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>{tr.processing}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>{progress}%</span>
        </div>
        <div style={{ height: '0.375rem', background: 'var(--surface-2)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '9999px', width: `${progress}%`, transition: 'width 0.5s ease-out' }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {stepKeys.map(key => {
          const step = { key };
          const s = steps[key] ?? { status: 'pending', message: '' };
          const running = s.status === 'running';
          const done    = s.status === 'done';
          const error   = s.status === 'error';

          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.625rem', borderRadius: '0.625rem', background: running ? 'var(--accent-bg)' : 'transparent', transition: 'background 0.15s' }}>
              {/* Icon */}
              <div style={{ width: '1.625rem', height: '1.625rem', borderRadius: '0.5rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--green-bg)' : error ? 'var(--red-bg)' : running ? 'var(--accent-bg)' : 'var(--surface-2)',
              }}>
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : error ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--red-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                ) : running ? (
                  <span style={{ width: '0.875rem', height: '0.875rem', border: `2px solid var(--accent)`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'block' }} />
                ) : (
                  <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: 'var(--border-2)', display: 'block' }} />
                )}
              </div>

              {/* Label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1, margin: 0,
                  color: running ? 'var(--accent)' : done ? 'var(--text)' : error ? 'var(--red-text)' : 'var(--text-faint)',
                }}>
                  {tr.steps[key as keyof typeof tr.steps]}
                </p>
                {s.message && (
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={async () => {
          await fetch(`/api/cancel/${jobId}`, { method: 'POST' });
          onCancel();
        }}
        style={{ width: '100%', fontSize: '0.8125rem', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', marginTop: '0.25rem' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
        {tr.cancelJob}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
