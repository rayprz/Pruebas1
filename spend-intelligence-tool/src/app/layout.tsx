import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TaxonomyProvider } from "@/lib/taxonomyStore";
import { SpendProvider } from "@/lib/spendStore";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spend Intelligence Tool",
  description:
    "Classify and segment company spend by category and subcategory to build a procurement strategy.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-canvas text-ink">
        <TaxonomyProvider>
          <SpendProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                <main className="flex-1 px-6 py-7">
                  <div className="mx-auto max-w-7xl">{children}</div>
                </main>
              </div>
            </div>
          </SpendProvider>
        </TaxonomyProvider>
      </body>
    </html>
  );
}
