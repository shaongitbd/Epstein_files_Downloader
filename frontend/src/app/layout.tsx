import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Jeffrey Epstein - Photo Gallery",
    template: "%s",
  },
  description: "Browse the declassified Epstein files document and image archive. Search through extracted text, view EXIF metadata, and explore GPS-tagged images.",
  keywords: ["Epstein files", "declassified documents", "document archive", "image gallery", "FOIA", "Jeffrey Epstein"],
  openGraph: {
    title: "Jeffrey Epstein - Photo Gallery",
    description: "Browse the declassified Epstein files document and image archive.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jeffrey Epstein - Photo Gallery",
    description: "Browse the declassified Epstein files document and image archive.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} ${playfair.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
