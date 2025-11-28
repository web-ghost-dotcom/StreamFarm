import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/lib/providers/Web3Provider";
import { AnimatedBackgroundWrapper } from "@/lib/components/AnimatedBackgroundWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StreamFarm - Real-time Agro Trading",
  description: "Decentralized agricultural marketplace with real-time auctions powered by Somnia Data Streams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnimatedBackgroundWrapper />
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
