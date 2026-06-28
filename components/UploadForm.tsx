'use client';

import { useState, useRef } from 'react';
import { VOICES, DEFAULT_VOICE_ID } from '@/lib/voices';
import { useLang } from './LangProvider';

interface Props {
  onJobStart: (jobId: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export default function UploadForm({ onJobStart, onError, disabled }: Props) {
  const { tr } = useLang();
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let res: Response;
      if (mode === 'file') {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error(tr.noFile);
        const form = new FormData();
        form.append('file', file);
        form.append('voiceId', voiceId);
        res = await fetch('/api/dub', { method: 'POST', body: form });
      } else {
        if (!url.trim()) throw new Error(tr.noUrl);
        res = await fetch('/api/dub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim(), voiceId }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error ?? 'Unknown error');
      }
      const { jobId } = await res.json();
      onJobStart(jobId);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8125rem',
    fontWeight: 500, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '0.375rem', transition: 'all 0.15s',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
  });

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

      {/* Mode tabs */}
      <div style={{ display: 'flex', padding: '0.25rem', background: 'var(--surface-2)', borderRadius: '0.75rem', gap: '0.25rem' }}>
        <button type="button" onClick={() => setMode('file')} style={tabStyle(mode === 'file')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {tr.uploadFile}
        </button>
        <button type="button" onClick={() => setMode('url')} style={tabStyle(mode === 'url')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
          </svg>
          {tr.youtubeUrl}
        </button>
      </div>

      {/* Input */}
      {mode === 'file' ? (
        <label key="file" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '7rem', border: '2px dashed var(--border-2)', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.15s', gap: '0.375rem' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'transparent'; }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', color: fileName ? 'var(--text)' : 'var(--text-muted)', fontWeight: fileName ? 500 : 400 }}>
            {fileName || tr.clickToSelect}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{tr.fileTypes}</span>
          <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} required
            onChange={e => setFileName(e.target.files?.[0]?.name ?? '')} />
        </label>
      ) : (
        <div key="url" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
          </div>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '0.625rem', paddingBottom: '0.625rem', fontSize: '0.8125rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '0.75rem', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-bg)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            required />
        </div>
      )}

      {/* Voice selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr.voice}</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {VOICES.map((v) => {
            const sel = voiceId === v.id;
            return (
              <button key={v.id} type="button" onClick={() => setVoiceId(v.id)}
                style={{ padding: '0.625rem 0.5rem', borderRadius: '0.75rem', fontSize: '0.8125rem', textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent)' : 'var(--surface-2)', color: sel ? '#fff' : 'var(--text)', transition: 'all 0.15s' }}>
                <span style={{ display: 'block', fontWeight: 600, lineHeight: 1.2 }}>{v.name}</span>
                <span style={{ display: 'block', fontSize: '0.6875rem', marginTop: '0.2rem', color: sel ? 'rgba(255,255,255,0.7)' : 'var(--text-faint)' }}>
                  {v.gender === 'female' ? tr.female : tr.male}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={disabled || loading}
        style={{ width: '100%', padding: '0.625rem 1rem', background: loading || disabled ? 'var(--accent)' : 'var(--accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled || loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'opacity 0.15s' }}
        onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.background = 'var(--accent-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}>
        {loading ? (
          <>
            <span style={{ width: '1rem', height: '1rem', border: `2px solid var(--spinner-border)`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'block' }} />
            {tr.starting}
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {tr.dubToSpanish}
          </>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
