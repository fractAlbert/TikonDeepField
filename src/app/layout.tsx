import type { Metadata } from "next";
import { Antonio } from "next/font/google";
import "./globals.css";

const antonio = Antonio({
  variable: "--font-lcars",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Quasar: Isolinear",
  description: "Deep-space quasar classification logic puzzles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${antonio.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden flex flex-col bg-lcars-black text-lcars-ice">
        {children}
      </body>
    </html>
  );
}
