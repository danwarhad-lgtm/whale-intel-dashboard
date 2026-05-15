import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/query-provider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata = {
  title: "Whale Intel · Polyglot Crypto Terminal",
  description:
    "Polyglot crypto whale intelligence dashboard — JavaScript, Python, Go, SQL, Bash.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <QueryProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
