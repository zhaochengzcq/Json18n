import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Json18n | Translate Missing Keys Safely",
  description:
    "AI-powered tool to auto-translate missing i18n JSON keys. Detects diffs locally and safely merges results without overwriting existing translations.",
  openGraph: {
    title: "Json18n",
    description:
      "Auto-translate missing i18n JSON keys with AI. No overwrites. Safe merge.",
    url: "https://json18n.vercel.app/",
    siteName: "Json18n",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </Providers>
    </html>
  );
}
