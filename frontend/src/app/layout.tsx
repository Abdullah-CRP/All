import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "HackDataV2 | Synthetic Data Platform",
  description: "Enterprise synthetic data platform with RAG routing and referential integrity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-base text-espresso`}>
        {children}
      </body>
    </html>
  );
}
