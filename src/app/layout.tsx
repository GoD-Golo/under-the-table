import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Under The Table",
  description:
    "This website lets users create custom characters with automated stat calculation, spell management, and inventory tracking, offering full customization options for race, class, abilities, and more. Alongside the character tools, the site features an intuitive map editor, allowing users to build detailed environments with a drag-and-drop interface for terrain, structures, and encounters. Maps can be enhanced with customizable grids, fog of war, and layer management, and exported for use in virtual tabletop platforms. With built-in campaign management tools and a community sharing feature, users can organize, share, and collaborate on their game content seamlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
