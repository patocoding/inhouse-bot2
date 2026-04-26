import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inhouse LoL",
  description: "Vincular conta, ranking e códigos para o bot Discord",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
