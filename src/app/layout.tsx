import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./brand-copy.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = { title: "FactorX Proxys — Proxies testadas sob demanda", description: "Busque e teste proxies públicas no momento do pedido. Até 50 por solicitação, somente aprovadas.", openGraph: { title: "Factor X // Proxys", description: "Fontes gratuitas. Testes reais. Proxies sob demanda.", type: "website" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body className={`${inter.variable} ${display.variable} ${mono.variable}`}>{children}</body></html>; }
