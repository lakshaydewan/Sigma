import type { Metadata } from "next";
import "./globals.css";
import { Room } from "./Room";

export const metadata: Metadata = {
  title: "Sigma",
  description: "A fully-functional figma clone with live collaborative features.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-sans antialiased`}
      >
        <Room>
          {children}
        </Room>
      </body>
    </html>
  );
}
