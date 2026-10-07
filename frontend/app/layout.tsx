import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Typeform — Forms worth filling out",
  description: "Build conversational forms that people actually complete.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
