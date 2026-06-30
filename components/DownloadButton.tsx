'use client';

import { useLang } from './LangProvider';

interface Props {
  jobId: string;
  mode?: 'dub' | 'subtitle';
}

export default function DownloadButton({ jobId, mode = 'dub' }: Props) {
  const { tr } = useLang();
  return (
    <a href={`/api/download/${jobId}`} download
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.7rem 1rem', background: 'var(--green-gradient)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', textDecoration: 'none', boxSizing: 'border-box', transition: 'filter 0.15s', boxShadow: '0 2px 12px rgba(13,158,71,0.25)' }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      {mode === 'subtitle' ? tr.downloadSubtitles : tr.downloadVideo}
    </a>
  );
}
