import type { ReactNode } from "react";

type AreaIconProps = {
  name: string;
  fallback?: string;
  className?: string;
};

const icons: Record<string, ReactNode> = {
  cozinha: <>
    <path className="area-icon-soft" d="M7 15.5h18l-1.8 10H8.8l-1.8-10Z" />
    <path d="M6.5 15.5h19m-19 3H4m23 0h-1.5M11 11c0-1.7 1.7-2.2 1.7-4.4M17 11c0-1.7 1.7-2.2 1.7-4.4" />
    <path className="area-icon-accent" d="M14.2 18.8c1.5-2.6 4.7-3.1 7-1.7-.8 3.1-3.8 4.4-7 3.6-.5-.1-.6-1.1 0-1.9Z" />
    <path className="area-icon-detail" d="M15 20.2c1.4-.8 2.8-1.6 4-2.4" />
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
    <path className="area-icon-soft" d="M16 15c-2.5-2.8-6.5-.6-7.6 2.8-.7 2.3.6 3.8 2.8 3.5 1-.2 1.8-.7 2.8-.7s1.8.5 2.8.7c2.2.3 3.5-1.2 2.8-3.5-.3-1.1-1-2.1-1.8-2.8Z" />
    <ellipse className="area-icon-accent" cx="8" cy="10" rx="2.1" ry="2.8" transform="rotate(-25 8 10)" />
    <ellipse className="area-icon-accent" cx="14" cy="7.8" rx="2" ry="2.7" />
    <ellipse className="area-icon-accent" cx="20" cy="10" rx="2.1" ry="2.8" transform="rotate(25 20 10)" />
    <path className="area-icon-detail" d="M8 10.2c.7 1.4 1.5 2.4 2.7 3.1m3.3-5.2v4m6-2c-.6 1.4-1.5 2.4-2.7 3.1" />
    <path d="M10.5 21.3c.4-.6.8-1.1 1.4-1.4m4.2 1.4c-.4-.6-.8-1.1-1.4-1.4" />
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
