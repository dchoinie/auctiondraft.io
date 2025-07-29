import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Exo_2 } from "next/font/google";
import { PageTransition } from "@/components/ui/page-transition";

const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-exo2",
});

export const metadata: Metadata = {
  title: "AuctionDraft.io",
  description: "AuctionDraft.io",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en" className={exo2.variable}>
        <body>
          <PageTransition>{children}</PageTransition>
        </body>
      </html>
    </ClerkProvider>
  );
}
