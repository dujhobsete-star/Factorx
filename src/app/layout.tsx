import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./brand-copy.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = { title: "FactorX Proxys — Proxies públicas verificadas", description: "Pool automatizada de proxies públicas verificadas e prontas para gerar.", openGraph: { title: "Factor X // Proxys", description: "Proxy infrastructure, verificada e mantida automaticamente.", type: "website" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body className={`${inter.variable} ${display.variable} ${mono.variable}`}>{children}</body></html>; }
