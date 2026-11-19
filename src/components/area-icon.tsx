import type { ReactNode } from "react";

type AreaIconProps = {
  name: string;
  fallback?: string;
  className?: string;
};

const icons: Record<string, ReactNode> = {
  cozinha: <>
    <path className="area-icon-soft" d="M6 15h18l-1.8 9H8L6 15Z" />
    <path d="M5 15h20m-20 3H3m24 0h-2m-14-7c0-1.5 1.5-2 1.5-4m5.5 4c0-1.5 1.5-2 1.5-4" />
    <circle className="area-icon-accent" cx="14" cy="18.8" r="2.4" />
    <path className="area-icon-detail" d="M14 18.8c.7-.6 1.1-1.3 1.3-2.1" />
  </>,
  sala: <>
    <path className="area-icon-soft" d="M6 14h20v9H6z" />
    <path d="M8 14V9.5A2.5 2.5 0 0 1 10.5 7h11A2.5 2.5 0 0 1 24 9.5V14m-18 0a2 2 0 0 0-2 2v7h24v-7a2 2 0 0 0-2-2M7 23v2m18-2v2" />
    <path className="area-icon-accent" d="M9 10h5v5H9zm9 0h4v5h-4z" />
    <path className="area-icon-detail" d="M16.5 11v3" />
  </>,
  banheiro: <>
    <path className="area-icon-soft" d="M5 16h22v2a7 7 0 0 1-7 7h-8a7 7 0 0 1-7-7v-2Z" />
    <path d="M5 16h22m-18 9v2m14-2v2M9 16V8a2.5 2.5 0 0 1 5 0v2" />
    <path className="area-icon-accent" d="M10 8a1 1 0 1 1 2 0v2h-2zm11 1.5a1.5 1.5 0 1 1-3 0c0-.8 1.5-2.7 1.5-2.7S21 8.7 21 9.5Zm4 4a1 1 0 1 1-2 0c0-.5 1-1.8 1-1.8s1 1.3 1 1.8Z" />
    <path className="area-icon-detail" d="M10 19h12" />
  </>,
  quartos: <>
    <path className="area-icon-soft" d="M5 17h22v6H5z" />
    <path d="M5 23V9m22 14V9M5 17h22M5 14h7a3 3 0 0 1 3 3m0 0v-1a3 3 0 0 1 3-3h9" />
    <path className="area-icon-accent" d="M7 15h4a2 2 0 0 1 2 2H7zm11 1.5 2-2 2 2v1h-4z" />
    <path className="area-icon-detail" d="M22 7.3a2 2 0 1 1-2.6-2.6 2.5 2.5 0 1 0 2.6 2.6Z" />
  </>,
  escritorio: <>
    <path className="area-icon-soft" d="M6 5h20v14H6z" />
    <path d="M6 5h20v14H6zm-3 22h26M10 19l-1.5 5m13.5-5 1.5 5" />
    <path className="area-icon-accent" d="m13 12 2.2 2.2L20 9.5" />
    <path className="area-icon-detail" d="m10 9 1.5 1.5" />
  </>,
  pets: <>
    <ellipse className="area-icon-accent" cx="7.5" cy="10.8" rx="2.6" ry="3.2" transform="rotate(-24 7.5 10.8)" />
    <ellipse className="area-icon-accent" cx="13.3" cy="7.4" rx="2.7" ry="3.2" transform="rotate(-8 13.3 7.4)" />
    <ellipse className="area-icon-accent" cx="19.2" cy="7.9" rx="2.7" ry="3.2" transform="rotate(10 19.2 7.9)" />
    <ellipse className="area-icon-accent" cx="24" cy="11.6" rx="2.5" ry="3.1" transform="rotate(25 24 11.6)" />
    <path className="area-icon-soft" d="M15.8 13.4c-1.6-1.8-4.4-1.6-5.5.5-.9 1.7-.1 4.1 1.6 5.6 1.3 1.2 2.4 1.4 3.9 1.4s2.6-.2 3.9-1.4c1.7-1.5 2.5-3.9 1.6-5.6-1.1-2.1-3.9-2.3-5.5-.5Z" />
  </>
};

const keys: Record<string, string> = {
  kitchen: "cozinha", cozinha: "cozinha", living: "sala", sala: "sala",
  bathroom: "banheiro", banheiro: "banheiro", bedroom: "quartos", quartos: "quartos", quarto: "quartos",
  office: "escritorio", escritório: "escritorio", pets: "pets", pet: "pets"
};

const defaultIcons: Record<string, string> = {
  cozinha: "🍳", sala: "🛋️", banheiro: "🫧", quartos: "🛏️", escritorio: "💻", pets: "🐾"
};

export function AreaIcon({ name, fallback, className = "" }: AreaIconProps) {
  const key = keys[name.trim().toLocaleLowerCase("pt-BR")];
  const useIllustration = key && (!fallback || fallback === defaultIcons[key]);

  return <span className={`area-symbol${key ? ` area-symbol--${key}` : ""} ${className}`.trim()} aria-hidden="true">
    {useIllustration ? <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[key]}</svg> : fallback}
  </span>;
}
