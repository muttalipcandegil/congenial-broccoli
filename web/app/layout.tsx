export const metadata = {
  title: "Gatespy",
  description: "Checkout link analyzer powered by headless Selenium",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-gatespy-900 via-gatespy-700 to-gatespy-500 text-white">
        {children}
      </body>
    </html>
  );
}