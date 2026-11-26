import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Syne } from "next/font/google";

import Providers from "@/components/Providers";
import "./globals.css";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const cuerpo = DM_Sans({
  subsets: ["latin"],
  variable: "--font-cuerpo",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "COMMUNITY 360",
  description:
    "Arquitectura de datos en la nube y dashboard analítico en tiempo real para comunidades creativas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${cuerpo.variable}`}>
      <body className="font-cuerpo">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
