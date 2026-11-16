"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { BrandMark } from "@/components/brand-mark";

export type AppSection = "today" | "nos" | "rewards" | "casa";

const destinations: Array<{ id: AppSection; href: string; label: string; icon: "sun" | "people" | "star" | "home" }> = [
  { id: "today", href: "/today", label: "Hoje", icon: "sun" },
  { id: "nos", href: "/nos", label: "Nós", icon: "people" },
  { id: "rewards", href: "/rewards", label: "Recompensas", icon: "star" },
  { id: "casa", href: "/casa", label: "Casa", icon: "home" }
];

function DestinationIcon({ icon }: { icon: (typeof destinations)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="primary-nav__icon">
    {icon === "sun" && <g {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></g>}
    {icon === "people" && <g {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h1.4a4.8 4.8 0 0 1 4.8 4.8V20Zm12-11.7a3 3 0 0 1 0 5.8m2.2 1.5a4.5 4.5 0 0 1 2.8 4.2V20" /></g>}
    {icon === "star" && <path {...common} d="m12 3 2.75 5.58 6.15.9-4.45 4.33 1.05 6.12L12 17.04l-5.5 2.89 1.05-6.12L3.1 9.48l6.15-.9L12 3Z" />}
    {icon === "home" && <g {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-7h6v7" /></g>}
  </svg>;
}

function BrandLink() {
  return <Link href="/today" className="app-brand-lockup" aria-label="cuidam — ir para Hoje">
    <span className="app-brand-mark"><BrandMark /></span>
    <span>cuidam</span>
  </Link>;
}

export function AppChrome({ current }: { current: AppSection }) {
  return <>
    <header className="app-topbar">
      <BrandLink />
      <LogoutButton />
    </header>
    <nav className="primary-nav" aria-label="Navegação principal">
      <div className="primary-nav__brand"><BrandLink /></div>
      <div className="primary-nav__links">
        {destinations.map((destination) => <Link
          href={destination.href}
          key={destination.id}
          className={`primary-nav__link${current === destination.id ? " is-active" : ""}`}
          aria-current={current === destination.id ? "page" : undefined}
        >
          <DestinationIcon icon={destination.icon} />
          <span>{destination.label}</span>
        </Link>)}
      </div>
      <p className="primary-nav__note">Uma casa mais leve começa com uma divisão clara.</p>
    </nav>
  </>;
}

