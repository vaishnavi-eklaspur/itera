import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { preconnect } from "react-dom";
import { connection } from "next/server";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "500", "600", "700"] });

export const instant = false;

export const metadata: Metadata = {
  title: {
    default: "Itera — Kerala & South India Travel Packages",
    template: "%s | Itera",
  },
  description:
    "Handcrafted holiday packages across Kerala and South India. Houseboats, hill stations, temples and beaches — curated by local experts.",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://itera.vercel.app"),
  openGraph: {
    type: "website",
    siteName: "Itera",
    title: "Itera — Kerala & South India Travel Packages",
    description: "Handcrafted holiday packages across Kerala and South India. Houseboats, hill stations, temples and beaches — curated by local experts.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  preconnect("https://images.unsplash.com");
  preconnect("https://b3681537.assetcdn.net");
  await connection();

  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} antialiased bg-ivory text-stone-900`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-forest-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
