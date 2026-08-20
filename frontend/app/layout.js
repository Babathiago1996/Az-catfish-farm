import "./globals.css";
import { Providers } from "@/providers/providers";
import { Toaster } from "sonner";

export const metadata = {
  title: "AZ Fish Farm | Smarter Farm Management",
  description: "A modern catfish farm management platform for AZ Fish Farm."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
