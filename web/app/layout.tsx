import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResolveX — Complaint Management System",
  description:
    "ResolveX is a living membrane between an organization and its customers. Intelligent complaint resolution at scale.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-abyss font-sans text-solvent antialiased">
        {children}
      </body>
    </html>
  );
}
