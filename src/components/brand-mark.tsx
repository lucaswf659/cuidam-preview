export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <svg className={compact ? "cuidam-mark-svg compact" : "cuidam-mark-svg"} viewBox="0 0 48 48" role="img" aria-label="Casa com broto">
    <path d="M7 22 24 7.5 41 22v15.5a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19.5 40.5V30a4.5 4.5 0 0 1 9 0v10.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23.8 24.5c-5.3.1-8.4-3.1-7.8-7.8 4.7-.4 7.9 2.5 7.8 7.8Z" fill="#68bb7f" stroke="#376b45" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M24.2 24c.2-5.4 3.8-8.2 8.2-7.4.5 4.6-2.7 7.7-8.2 7.4Z" fill="#f4c95d" stroke="#376b45" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M20.1 23.7c1.3.1 2.6.2 4.1.2 1.2-2.3 3-4 5-5.1" fill="none" stroke="#376b45" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;
}
