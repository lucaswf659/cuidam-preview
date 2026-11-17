export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? "cuidam-mark-svg compact" : "cuidam-mark-svg"} viewBox="0 0 48 48" role="img" aria-label="Casa com folha">
    <path d="M11 23.5 24 11l13 12.5v14H11Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M29.2 35.8c.1-5.1 2.8-7.7 7.6-7.9.2 4.7-2.4 7.6-7.6 7.9Z" fill="#68bb7f" stroke="#68bb7f" strokeWidth="1" strokeLinejoin="round" />
    <path d="M30.2 34.8c1.5-1.2 2.9-2.5 4.2-4" fill="none" stroke="#dcefe0" strokeWidth="1" strokeLinecap="round" />
  </svg>;
}
