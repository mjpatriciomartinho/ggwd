import type { Metadata } from "next";
import { Chakra_Petch, Instrument_Sans, Silkscreen } from "next/font/google";
import { Suspense } from "react";
import { AccessCode } from "@/components/AccessCode";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/lib/site";
import "./globals.css";

const display = Chakra_Petch({ variable: "--ff-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Instrument_Sans({ variable: "--ff-body", subsets: ["latin"] });
const pixel = Silkscreen({ variable: "--ff-pixel", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: `${SITE.name}: Steam review analysis for game developers`, template: `%s · ${SITE.name}` },
  description: SITE.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${pixel.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Suspense>
          <AccessCode />
        </Suspense>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
