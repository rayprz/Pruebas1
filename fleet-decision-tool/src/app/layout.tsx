import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ParamsProvider } from "@/lib/store";
import { CatalogProvider } from "@/lib/catalogStore";
import { FleetProvider } from "@/lib/fleetStore";
import { QuarryProvider } from "@/lib/quarryStore";
import { ShiftProvider } from "@/lib/shiftStore";
import { MaintProvider } from "@/lib/maintStore";
import { FleetHistoryProvider } from "@/lib/fleetHistoryStore";
import { PeriodProvider } from "@/lib/periodStore";
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
  title: "Fleet Decision Tool",
  description:
    "Multi-brand mobile equipment owning & operating cost and fleet decision support",
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
        <ParamsProvider>
          <CatalogProvider>
          <FleetProvider>
          <QuarryProvider>
          <ShiftProvider>
          <MaintProvider>
          <FleetHistoryProvider>
          <PeriodProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                <main className="flex-1 px-6 py-7">
                  <div className="mx-auto max-w-7xl">{children}</div>
                </main>
              </div>
            </div>
          </PeriodProvider>
          </FleetHistoryProvider>
          </MaintProvider>
          </ShiftProvider>
          </QuarryProvider>
          </FleetProvider>
          </CatalogProvider>
        </ParamsProvider>
      </body>
    </html>
  );
}
