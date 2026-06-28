'use client';

import { useLang } from './LangProvider';

interface Props {
  jobId: string;
}

export default function DownloadButton({ jobId }: Props) {
  const { tr } = useLang();
  return (
    <a href={`/api/download/${jobId}`} download
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.625rem 1rem', background: 'var(--green)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', textDecoration: 'none', boxSizing: 'border-box', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--green)')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      {tr.downloadVideo}
    </a>
  );
}
