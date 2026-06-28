'use client';

import { useState, useEffect, useRef } from 'react';

const TYPES = ['Suggestion', 'Bug report', 'General feedback'] as const;
type FeedbackType = typeof TYPES[number];

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const [type, setType]       = useState<FeedbackType>('Suggestion');
  const [message, setMessage] = useState('');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send');
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: '0.625rem', color: 'var(--text)', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', width: '100%', maxWidth: '26rem', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.375rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>Share feedback</h2>
            <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Help us improve Video Dubber</p>
          </div>
          <button onClick={onClose}
            style={{ width: '1.875rem', height: '1.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', borderRadius: '0.5rem' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.375rem' }}>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: '0.9375rem' }}>Thank you!</p>
              <p style={{ margin: '0.375rem 0 1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Your feedback has been sent.</p>
              <button onClick={onClose} style={{ padding: '0.5rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '0.625rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Type */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    style={{ flex: 1, padding: '0.375rem 0.25rem', fontSize: '0.75rem', fontWeight: 500, borderRadius: '0.5rem', cursor: 'pointer', border: `1.5px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`, background: type === t ? 'var(--accent-bg)' : 'var(--surface-2)', color: type === t ? 'var(--accent-text)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Message */}
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={4}
                  placeholder="Describe your suggestion or report..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '6rem', lineHeight: 1.5 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              </div>

              {/* Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                </div>
              </div>

              {status === 'error' && (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--red-text)', background: 'var(--red-bg)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                  {errorMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                <button type="button" onClick={onClose}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', borderRadius: '0.625rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={status === 'sending' || !message.trim()}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '0.625rem', cursor: status === 'sending' ? 'wait' : 'pointer', opacity: !message.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {status === 'sending' ? (
                    <><span style={{ width: '0.875rem', height: '0.875rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'block' }} /> Sending…</>
                  ) : 'Send feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
