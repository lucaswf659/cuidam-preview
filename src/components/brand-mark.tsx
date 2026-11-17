export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? "cuidam-mark-svg compact" : "cuidam-mark-svg"} viewBox="0 0 48 48" role="img" aria-label="Casa com broto">
    <path d="M7 22 24 7.5 41 22v15.5a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3Z" fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19.5 40.5V30a4.5 4.5 0 0 1 9 0v10.5" fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 24c-6.2-.6-9-4.9-7.4-9.8C22 14 26 18.2 24 24Z" fill="#68bb7f" />
    <path d="M19.1 17.3c1.8 1.7 3.2 3.5 4.5 5.8" fill="none" stroke="#376b45" strokeWidth="1.8" strokeLinecap="round" />
  </svg>;
}
