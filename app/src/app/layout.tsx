import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { App as AntdApp, ConfigProvider } from "antd";
import StyledComponentsRegistry from "@/components/AntdRegistry";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APPSSCHOLL SIS/ERP",
  description: "Sistema administrativo escolar moderno y simple",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 text-gray-900`}>
        <StyledComponentsRegistry>
          <ConfigProvider
            theme={{
              token: {
                // Tailwind default font family
                fontFamily: "var(--font-geist-sans), Arial, sans-serif",
                colorPrimary: "#1890ff", // We can customize this per role later
                colorBgLayout: "#f0f2f5",
                borderRadius: 6,
              },
            }}
          >
            <AntdApp>{children}</AntdApp>
          </ConfigProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
