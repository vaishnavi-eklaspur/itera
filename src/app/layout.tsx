import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"] });

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-white text-slate-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
