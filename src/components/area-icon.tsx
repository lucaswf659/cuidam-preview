import type { ReactNode } from "react";

type AreaIconProps = {
  name: string;
  fallback?: string;
  className?: string;
};

const paths: Record<string, ReactNode> = {
  cozinha: <><path d="M4 11h16l-1.4 9H5.4L4 11Z" /><path d="M3 11h18M8 7c0-1.5 1.2-2.1 1.2-3.5M12 7c0-1.5 1.2-2.1 1.2-3.5" /><path d="M14.5 16c1.2-1.5 2.6-2 4.2-1.8-.2 1.8-1.3 3-3.5 3.3" /></>,
  sala: <><path d="M5 12V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><path d="M4 12h16a2 2 0 0 1 2 2v4H2v-4a2 2 0 0 1 2-2ZM5 18v2m14-2v2" /></>,
  banheiro: <><path d="M4 12h16v2a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-2Z" /><path d="M6 12V6a2 2 0 0 1 4 0m-1 0h2" /><path d="M8 20v1m8-1v1" /></>,
  quartos: <><path d="M3 19V8m18 11V8M3 15h18v4H3Zm0-4h5a3 3 0 0 1 3 3v1H3Zm8 4v-1a3 3 0 0 1 3-3h7v4" /></>,
  escritorio: <><path d="M4 4h16v12H4zM2 20h20M8 16l-1 4m9-4 1 4" /><path d="m9 10 2 2 4-4" /></>,
  pets: <><path d="M8 12c1.1 0 2-.9 2-2S9.1 7 8 7s-2 1.3-2 3 1 2 2 2Zm8 0c1.1 0 2-.9 2-2s-.9-3-2-3-2 1.3-2 3 1 2 2 2Zm-12-1c1 0 1.8-.9 1.8-2S5 7 4 7s-1.8.9-1.8 2  .8 2 1.8 2Zm16 0c1 0 1.8-.9 1.8-2S21 7 20 7s-1.8.9-1.8 2 .8 2 1.8 2Z" /><path d="M12 12c-2.8 0-6 3.1-6 5.4 0 1.7 1.2 2.6 2.8 2.6 1.1 0 2-.6 3.2-.6s2.1.6 3.2.6c1.6 0 2.8-.9 2.8-2.6 0-2.3-3.2-5.4-6-5.4Z" /></>
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
  return <span className={`area-symbol ${className}`.trim()} aria-hidden="true">
    {key && (!fallback || fallback === defaultIcons[key]) ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[key]}</svg> : fallback}
  </span>;
}
