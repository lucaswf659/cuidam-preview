import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing-home";

export const metadata: Metadata = {
  title: "cuidam — uma casa mais leve, em parceria",
  description: "Organizem as responsabilidades da casa com clareza e parceria. Menos cobrança. Mais cuidado no dia a dia.",
  openGraph: {
    title: "cuidam — cada um cuida do que é seu",
    description: "Uma casa mais leve começa sabendo o que é de cada um.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function Home() {
  return <MarketingHome />;
}
