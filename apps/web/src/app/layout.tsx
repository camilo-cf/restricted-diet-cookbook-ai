import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { GlobalErrorBanner } from "@/components/ui/GlobalErrorBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Restricted Diet Cookbook AI",
  description: "Generate personalized recipes for restricted diets.",
};

import { Navbar } from "@/components/navbar";

import { ToastProvider } from "@/components/ui/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans`}>
        <ToastProvider>
          <GlobalErrorBanner />
          <Navbar />
          <main className="min-h-screen bg-background text-foreground">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
