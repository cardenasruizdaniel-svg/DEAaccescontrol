import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "DLA Access Enterprise | DLA Redes y Seguridad",
  description: "ERP Enterprise - Control de Acceso, Geolocalización y Gestión de Personal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DLA Access",
  },
  icons: {
    icon: "/icons/icon-512.svg",
    apple: "/icons/icon-512.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1a56db",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="application-name" content="DLA Access" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
