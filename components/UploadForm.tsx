'use client';

import { useState, useRef } from 'react';
import { DEFAULT_VOICE_ID, getVoicesByLang } from '@/lib/voices';
import type { TargetLang } from '@/lib/voices';
import type { PipelineMode } from '@/lib/pipeline';
import { useLang } from './LangProvider';

interface Props {
  onJobStart: (jobId: string) => void;
  onError: (msg: string) => void;
  onTargetLangChange?: (lang: TargetLang) => void;
  onModeChange?: (mode: PipelineMode) => void;
  onVoiceIdChange?: (voiceId: string) => void;
  initialTargetLang?: TargetLang;
  initialMode?: PipelineMode;
  initialVoiceId?: string;
  disabled?: boolean;
}

const YOUTUBE_DISABLED = process.env.NEXT_PUBLIC_DISABLE_YOUTUBE === 'true';

export default function UploadForm({
  onJobStart, onError, onTargetLangChange, onModeChange, onVoiceIdChange,
  initialTargetLang = 'es', initialMode = 'dub', initialVoiceId, disabled,
}: Props) {
  const { tr } = useLang();
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file');
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>(initialMode);
  const [url, setUrl] = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>(initialTargetLang);
  const voices = getVoicesByLang(targetLang);
  const [voiceId, setVoiceId] = useState<string>(
    initialVoiceId ?? getVoicesByLang(initialTargetLang)[0]?.id ?? DEFAULT_VOICE_ID
  );
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewCache = useRef<Record<string, string>>({});
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function handleFileSelected(file: File | undefined) {
    setFileName(file?.name ?? '');
    if (file && fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
    }
  }

  function handleTargetLangChange(lang: TargetLang) {
    setTargetLang(lang);
    const newVoices = getVoicesByLang(lang);
    const newVoiceId = newVoices[0]?.id ?? DEFAULT_VOICE_ID;
    setVoiceId(newVoiceId);
    onTargetLangChange?.(lang);
    onVoiceIdChange?.(newVoiceId);
  }

  function handleVoiceIdChange(id: string) {
    setVoiceId(id);
    onVoiceIdChange?.(id);
  }

  async function playPreview(voiceId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (playingVoice === voiceId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    audioRef.current?.pause();

    setPlayingVoice(voiceId);
    const voiceLang = voices.find(v => v.id === voiceId)?.lang ?? 'es';
    const previewUrl = `/api/voice-preview/${voiceId}?lang=${voiceLang}`;
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
    audio.play().catch(() => setPlayingVoice(null));
  }

  function handlePipelineModeChange(m: PipelineMode) {
    setPipelineMode(m);
    onModeChange?.(m);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(null);
    try {
      let jobId: string;
      if (inputMode === 'file') {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error(tr.noFile);
        const form = new FormData();
        form.append('file', file);
        form.append('voiceId', voiceId);
        form.append('targetLang', targetLang);
        form.append('mode', pipelineMode);
        jobId = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.jobId);
            } else {
              const data = JSON.parse(xhr.responseText).catch?.(() => ({})) ?? {};
              reject(new Error(data.error ?? 'Request failed'));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.open('POST', '/api/dub');
          xhr.send(form);
        });
      } else {
        if (!url.trim()) throw new Error(tr.noUrl);
        const res = await fetch('/api/dub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim(), voiceId, targetLang, mode: pipelineMode }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error ?? 'Unknown error');
        }
        const data = await res.json();
        jobId = data.jobId;
      }
      onJobStart(jobId);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setUploadProgress(null);
      xhrRef.current = null;
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

  const dubLangTabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.4rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem',
    fontWeight: 500, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'all 0.15s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    boxShadow: 'none',
  });

  const dubLabels: Record<TargetLang, string> = { es: tr.dubToSpanish, 'pt-BR': tr.dubToPortuguese, ja: tr.dubToJapanese };
  const subtitleLabels: Record<TargetLang, string> = { es: tr.subtitleToSpanish, 'pt-BR': tr.subtitleToPortuguese, ja: tr.subtitleToJapanese };
  const submitLabel = pipelineMode === 'subtitle' ? subtitleLabels[targetLang] : dubLabels[targetLang];

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
    background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '0.6rem',
    color: 'var(--text)', outline: 'none', cursor: 'pointer', appearance: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

      {/* Mode tabs — only meaningful when there's a choice to make */}
      {!YOUTUBE_DISABLED && (
        <div style={{ display: 'flex', padding: '0.25rem', background: 'var(--surface-2)', borderRadius: '0.75rem', gap: '0.25rem' }}>
          <button type="button" onClick={() => setInputMode('file')} style={tabStyle(inputMode === 'file')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {tr.uploadFile}
          </button>
          <button type="button" onClick={() => setInputMode('url')} style={tabStyle(inputMode === 'url')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            {tr.youtubeUrl}
          </button>
        </div>
      )}

      {/* Input */}
      {inputMode === 'file' ? (
        <label key="file" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '7rem', border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-2)'}`, borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.15s', gap: '0.375rem', background: isDragging ? 'var(--accent-bg)' : 'transparent' }}
          onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)'; } }}
          onMouseLeave={e => { if (!isDragging) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'transparent'; } }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelected(e.dataTransfer.files?.[0]);
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', color: fileName ? 'var(--text)' : 'var(--text-muted)', fontWeight: fileName ? 500 : 400 }}>
            {fileName || tr.clickToSelect}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-faint)' }}>{tr.fileTypes}</span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 500 }}>{tr.maxDuration}</span>
          <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} required
            onChange={e => handleFileSelected(e.target.files?.[0])} />
        </label>
      ) : inputMode === 'url' ? (
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
      ) : null}

      {/* Dub language selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr.dubLangLabel}</label>
        <select
          value={targetLang}
          onChange={e => handleTargetLangChange(e.target.value as TargetLang)}
          style={selectStyle}
        >
          <option value="es">{tr.dubLangEs}</option>
          <option value="pt-BR">{tr.dubLangPt}</option>
          <option value="ja">{tr.dubLangJa}</option>
        </select>
      </div>

      {/* Pipeline mode toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr.modeLabel}</label>
        <div style={{ display: 'flex', padding: '0.2rem', background: 'var(--surface-2)', borderRadius: '0.6rem', gap: '0.2rem' }}>
          <button type="button" onClick={() => handlePipelineModeChange('dub')} style={dubLangTabStyle(pipelineMode === 'dub')}>
            {tr.modeDub}
          </button>
          <button type="button" onClick={() => handlePipelineModeChange('subtitle')} style={dubLangTabStyle(pipelineMode === 'subtitle')}>
            {tr.modeSub}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--text-faint)' }}>
          {pipelineMode === 'dub' ? tr.dubDisclaimer : tr.subtitleDisclaimer}
        </p>
      </div>

      {/* Voice selector — hidden for subtitle mode */}
      {pipelineMode === 'dub' && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tr.voice}</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {voices.map((v) => {
            const sel = voiceId === v.id;
            return (
              <button key={v.id} type="button" onClick={() => handleVoiceIdChange(v.id)}
                style={{ padding: '0.5rem 0.375rem', borderRadius: '0.75rem', fontSize: '0.8125rem', textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, background: sel ? 'var(--accent)' : 'var(--surface-2)', color: sel ? '#fff' : 'var(--text)', transition: 'all 0.15s', position: 'relative' }}>
                <span style={{ display: 'block', fontWeight: 600, lineHeight: 1.2 }}>{v.name}</span>
                <span style={{ display: 'block', fontSize: '0.6875rem', marginTop: '0.2rem', color: sel ? 'rgba(255,255,255,0.7)' : 'var(--text-faint)' }}>
                  {v.gender === 'female' ? tr.female : tr.male}
                </span>
                <span
                  role="button"
                  onClick={(e) => playPreview(v.id, e)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.3rem', width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: sel ? 'rgba(255,255,255,0.2)' : 'var(--border)', cursor: 'pointer' }}
                  title="Preview voice"
                >
                  {playingVoice === v.id ? (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8"/><rect x="6" y="1" width="3" height="8"/></svg>
                  ) : (
                    <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,1 9,5 2,9"/></svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>}

      {/* Submit */}
      <button type="submit" disabled={disabled || loading}
        style={{ width: '100%', padding: '0.7rem 1rem', background: 'var(--accent-gradient)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled || loading ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'opacity 0.15s, filter 0.15s', boxShadow: '0 2px 12px rgba(26,79,214,0.25)' }}
        onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.filter = 'brightness(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}>
        {loading && uploadProgress !== null ? (
          <>
            <span style={{ fontSize: '0.8125rem' }}>{tr.uploading} {uploadProgress}%</span>
          </>
        ) : loading ? (
          <>
            <span style={{ width: '1rem', height: '1rem', border: `2px solid var(--spinner-border)`, borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'block' }} />
            {tr.starting}
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {submitLabel}
          </>
        )}
      </button>

      {loading && (
        <button type="button"
          onClick={() => { xhrRef.current?.abort(); setLoading(false); setUploadProgress(null); }}
          style={{ width: '100%', fontSize: '0.8125rem', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
          {tr.cancelJob}
        </button>
      )}

      {uploadProgress !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ height: '0.25rem', background: 'var(--surface-2)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '9999px', width: `${uploadProgress}%`, transition: 'width 0.2s ease-out' }} />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
