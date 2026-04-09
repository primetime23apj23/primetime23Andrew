import React from "react"
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata = {
  title: "Multiplication Game",
  description:
    "Multiplication Game is a fun and educational math board game where players practice multiplication, roll dice, solve number challenges, and win through strategy.",
  keywords: [
    "math game for kids",
    "multiplication game",
    "learn multiplication",
    "educational math game",
    "kids math board game",
    "number learning game",
  ],
  generator: "Multiplication Game",

  icons: {
    icon: "/favicon.jpg",
    apple: "/favicon.jpg",
    shortcut: "/favicon.jpg",
  },

  openGraph: {
    title: "Multiplication Game",
    description:
      "An exciting math board game where kids learn multiplication through play, strategy, and dice rolls.",
    type: "website",
    images: [
      {
        url: "/dice-skins/owl.jpg",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Multiplication Game",
    description:
      "Learn multiplication with a fun, strategic board game for kids!",
    images: ["/dice-skins/owl.jpg"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
