import type { Metadata } from "next";
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
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
