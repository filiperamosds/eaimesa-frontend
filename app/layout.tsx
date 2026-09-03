import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EaiMesa — cardápio do estabelecimento no celular",
    template: "%s · EaiMesa",
  },
  description:
    "SaaS para bares e restaurantes: publique o cardápio numa URL sua. Sem app para o cliente, sem tablet sujo na mesa.",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
