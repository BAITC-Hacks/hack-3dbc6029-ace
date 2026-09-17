import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "LECTOR AI",
  description: "Lecture study workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
