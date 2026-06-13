import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ParamsProvider } from "@/lib/store";
import { NavBar } from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fleet Decision Tool",
  description:
    "Multi-brand mobile equipment owning & operating cost and fleet decision support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <ParamsProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 text-xs text-slate-500">
            Cost baseline: OEM 2022 base-year O&amp;O data (USD). Non-Caterpillar
            models are estimated from their equivalence class until real fleet
            data is loaded — tune escalation and brand factors in Parameters.
          </footer>
        </ParamsProvider>
      </body>
    </html>
  );
}
