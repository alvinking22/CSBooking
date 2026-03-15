import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getPublicConfig } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getPublicConfig();
  const name = config?.businessName || "CS Booking";
  return {
    title: { default: name, template: `%s | ${name}` },
    description: `Reserva tu sesión en ${name}. Sistema de reservas online para estudios de grabación.`,
    openGraph: {
      title: name,
      description: `Reserva tu sesión en ${name}`,
      type: "website",
      ...(config?.logo ? { images: [{ url: config.logo }] } : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getPublicConfig();
  const primaryColor = config?.primaryColor ?? "#3B82F6";

  return (
    <html lang="es" style={{ "--primary": primaryColor } as React.CSSProperties}>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers config={config}>{children}</Providers>
      </body>
    </html>
  );
}
