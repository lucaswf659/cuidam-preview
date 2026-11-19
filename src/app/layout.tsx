import type { Metadata } from "next";
import { ViewTransition } from "react";
import "./globals.css";
import "./motion.css";

export const metadata: Metadata = {
  title: "cuidam",
  description: "Cada um cuida do que é seu."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><ViewTransition default="app-route">{children}</ViewTransition></body>
    </html>
  );
}
