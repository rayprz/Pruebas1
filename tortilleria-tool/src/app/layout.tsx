import type { Metadata } from "next";
import "./globals.css";
import { ParamsProvider } from "@/lib/paramsStore";
import { MateriaPrimaProvider } from "@/lib/materiaPrimaStore";
import { ProduccionProvider } from "@/lib/produccionStore";
import { ClientesProvider } from "@/lib/clientesStore";
import { VentasProvider } from "@/lib/ventasStore";
import { NominaProvider } from "@/lib/nominaStore";
import { GastoProvider } from "@/lib/gastoStore";
import { InventarioProvider } from "@/lib/inventarioStore";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Tortillería — Administración",
  description: "Sistema de administración para tortillería",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ParamsProvider>
          <MateriaPrimaProvider>
            <ProduccionProvider>
              <ClientesProvider>
                <VentasProvider>
                  <NominaProvider>
                    <GastoProvider>
                      <InventarioProvider>
                        <div style={{ display: "flex", minHeight: "100vh" }}>
                          <Sidebar />
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <Topbar />
                            <main
                              style={{
                                flex: 1,
                                padding: "1.5rem",
                                paddingTop: "4.5rem",
                                paddingLeft: "2rem",
                              }}
                            >
                              <div style={{ maxWidth: "80rem", margin: "0 auto" }}>{children}</div>
                            </main>
                          </div>
                        </div>
                      </InventarioProvider>
                    </GastoProvider>
                  </NominaProvider>
                </VentasProvider>
              </ClientesProvider>
            </ProduccionProvider>
          </MateriaPrimaProvider>
        </ParamsProvider>
      </body>
    </html>
  );
}
