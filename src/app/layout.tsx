import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { LOCALE } from "@/i18n/request";
import "./globals.css";

// Figtree for text; Unbounded, wide and geometric, only for numbers and titles.
// Both are variable fonts served from npm (Fontsource) rather than fetched from Google
// at build time: Google sometimes answers CI machines with URLs Turbopack cannot read.
// The "latin" files cover every Portuguese character.
const figtree = localFont({
  src: "../../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
  variable: "--font-figtree",
  weight: "300 900",
  display: "swap",
});

const unbounded = localFont({
  src: "../../node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2",
  variable: "--font-unbounded",
  weight: "200 900",
  display: "swap",
});

export const metadata: Metadata = {
  // Permanent address of the app, used for the absolute URLs of link previews.
  metadataBase: new URL("https://habithub-app.vercel.app"),
  title: "HabitHub",
  description: "Seus hábitos numa grade, um quadradinho por dia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={LOCALE}
      // Smooth scrolling (globals.css) is for links within a page; Next jumps on route changes.
      data-scroll-behavior="smooth"
      className={`${figtree.variable} ${unbounded.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <NextIntlClientProvider>
            {children}
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
