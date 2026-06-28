'use client';

import { useState, useCallback } from 'react';
import UploadForm from '@/components/UploadForm';
import ProgressDisplay from '@/components/ProgressDisplay';
import DownloadButton from '@/components/DownloadButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import FeedbackModal from '@/components/FeedbackModal';

type AppState = 'idle' | 'processing' | 'done' | 'error';

export default function Home() {
  const [state, setState]           = useState<AppState>('idle');
  const [showFeedback, setFeedback] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleJobStart = (id: string) => { setJobId(id); setState('processing'); setError(null); };
  const handleComplete = useCallback(() => setState('done'), []);
  const handleError = useCallback((msg: string) => { setError(msg); setState('error'); }, []);
  const handleReset = () => { setState('idle'); setJobId(null); setError(null); };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '32rem' }}>

        {/* Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </div>
                <h1 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Video Dubber</h1>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>English</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>Latin American Spanish</span>
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Body */}
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {state === 'idle' && (
              <UploadForm onJobStart={handleJobStart} onError={handleError} />
            )}

            {state === 'processing' && jobId && (
              <ProgressDisplay jobId={jobId} onComplete={handleComplete} onError={handleError} />
            )}

            {state === 'done' && jobId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>Dubbing complete</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Your video is ready to download</p>
                  </div>
                </div>
                <DownloadButton jobId={jobId} />
                <button onClick={handleReset} style={{ width: '100%', fontSize: '0.8125rem', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
                  Dub another video
                </button>
              </div>
            )}

            {state === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: '0.75rem', padding: '0.875rem', display: 'flex', gap: '0.625rem' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--red-text)', lineHeight: 1.5 }}>{error}</p>
                </div>
                <button onClick={handleReset} style={{ width: '100%', fontSize: '0.8125rem', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0 0.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-faint)' }}>
            Powered by Groq · ElevenLabs · Claude
          </p>
          <button onClick={() => setFeedback(true)}
            style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Feedback
          </button>
        </div>

        {showFeedback && <FeedbackModal onClose={() => setFeedback(false)} />}
      </div>
    </main>
  );
}
