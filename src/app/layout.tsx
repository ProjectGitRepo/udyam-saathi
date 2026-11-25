import type { Metadata } from "next";
import { Inter, Instrument_Serif, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });
const devaSerif = Noto_Serif_Devanagari({ variable: "--font-deva-serif", subsets: ["devanagari"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "Udyam Saathi",
  description: "Get your stuck money back, find government schemes, keep your books — in Hindi, by voice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${deva.variable} ${devaSerif.variable} h-full antialiased`}>
      <body className="h-full text-[14px] leading-normal">{children}</body>
    </html>
  );
}
