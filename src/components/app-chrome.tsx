"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { LogoutButton } from "@/components/logout-button";
import { BrandMark } from "@/components/brand-mark";

export type AppSection = "today" | "nos" | "rewards" | "casa";

const destinations: Array<{ id: AppSection; href: string; label: string; icon: "sun" | "people" | "star" | "home" }> = [
  { id: "today", href: "/today", label: "Hoje", icon: "sun" },
  { id: "nos", href: "/nos", label: "Nós", icon: "people" },
  { id: "rewards", href: "/rewards", label: "Recompensas", icon: "star" },
  { id: "casa", href: "/casa", label: "Configurações", icon: "home" }
];

function DestinationIcon({ icon }: { icon: (typeof destinations)[number]["icon"] }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <span className={`primary-nav__icon-shell primary-nav__icon-shell--${icon}`}>
    <svg viewBox="0 0 24 24" aria-hidden="true" className="primary-nav__icon">
      {icon === "sun" && <g stroke="#9a7420" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.4v2m0 15.2v2M4.75 4.75l1.4 1.4m11.7 11.7 1.4 1.4M2.4 12h2m15.2 0h2M4.75 19.25l1.4-1.4m11.7-11.7 1.4-1.4" /><circle cx="12" cy="12" r="4.5" fill="#f4c95d" /></g>}
      {icon === "people" && <g stroke="#6d645c" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><circle cx="8.5" cy="8" r="3.2" fill="#f58e8e" /><circle cx="16.8" cy="9.2" r="2.6" fill="#8ec8ff" /><path d="M2.8 19.8v-1.1a5.7 5.7 0 0 1 11.4 0v1.1Z" fill="#f7c6bd" /><path d="M14 15.4a4.8 4.8 0 0 1 7.2 4.1v.3h-5" fill="#c9e4fa" /></g>}
      {icon === "star" && <><path d="m12 2.8 2.75 5.58 6.15.9-4.45 4.33 1.05 6.12L12 16.84l-5.5 2.89 1.05-6.12L3.1 9.28l6.15-.9L12 2.8Z" fill="#f4c95d" stroke="#a98228" strokeWidth="1.35" strokeLinejoin="round" /><path d="m18.3 3 .4 1.3L20 4.7l-1.3.4-.4 1.3-.4-1.3-1.3-.4 1.3-.4.4-1.3Z" fill="#f58e8e" stroke="none" /></>}
      {icon === "home" && <g {...stroke}><path d="m3 10 9-7 9 7v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5Z" fill="#dcefe0" /><path d="M9 21v-7h6v7" fill="#68bb7f" /><path d="M17.6 11.5c-1.7 0-2.8.8-2.9 2.1 1.5.2 2.7-.4 2.9-2.1Z" fill="#f58e8e" stroke="none" /></g>}
    </svg>
  </span>;
}

function BrandLink() {
  return <Link href="/today" className="app-brand-lockup" aria-label="cuidam — ir para Hoje">
    <span className="app-brand-mark"><BrandMark /></span>
    <span>cuidam</span>
  </Link>;
}

export function AppChrome({ current }: { current: AppSection }) {
  return <ViewTransition name="app-chrome" default="none">
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
          className={`primary-nav__link primary-nav__link--${destination.id}${current === destination.id ? " is-active" : ""}`}
          aria-current={current === destination.id ? "page" : undefined}
        >
          <DestinationIcon icon={destination.icon} />
          <span>{destination.label}</span>
        </Link>)}
      </div>
      <p className="primary-nav__note">Uma casa mais leve começa com uma divisão clara.</p>
    </nav>
  </ViewTransition>;
}

