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

const CSP = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} https:;
`.replace(/\n/g, "");

import { Navbar } from "@/components/navbar";

import { ToastProvider } from "@/components/ui/Toast";
import { WizardProvider } from "@/context/wizard-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans`}>
        <ToastProvider>
          <WizardProvider>
            <GlobalErrorBanner />
            <Navbar />
            <main className="min-h-screen bg-background text-foreground">
              {children}
            </main>
          </WizardProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
