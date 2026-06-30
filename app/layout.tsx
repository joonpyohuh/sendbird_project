import type { Metadata } from "next";
import { AppPreferencesProvider } from "@/components/shell/AppPreferencesProvider";
import ThemeScript from "@/components/shell/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Doc Workspace",
  description: "AI-assisted workspace for API documentation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <AppPreferencesProvider>{children}</AppPreferencesProvider>
      </body>
    </html>
  );
}
