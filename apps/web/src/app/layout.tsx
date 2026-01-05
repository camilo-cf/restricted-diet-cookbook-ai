import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GlobalErrorBanner } from "@/components/ui/GlobalErrorBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Restricted Diet Cookbook AI",
  description: "Generate personalized recipes for restricted diets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalErrorBanner />
        <main className="min-h-screen bg-background text-foreground">
          {children}
        </main>
      </body>
    </html>
  );
}
