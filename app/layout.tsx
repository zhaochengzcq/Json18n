import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CSPostHogProvider } from "./providers";
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
  title: "i18n JSON Auto Translator | Translate Missing Keys Safely",
  description:
    "AI-powered tool to auto-translate missing i18n JSON keys. Detects diffs locally and safely merges results without overwriting existing translations.",
  openGraph: {
    title: "i18n JSON Auto Translator",
    description:
      "Auto-translate missing i18n JSON keys with AI. No overwrites. Safe merge.",
    url: "https://i18n-json-auto-translator-46h8mbp8z.vercel.app/",
    siteName: "i18n JSON Auto Translator",
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
      <CSPostHogProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </CSPostHogProvider>
    </html>
  );
}
