import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cuidam",
  description: "Cada um cuida do que é seu."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
