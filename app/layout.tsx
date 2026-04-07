import React from "react"
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata = {
  title: "Times of Primes – Fun Math Game for Kids | Learn Prime Factorization",
  description:
    "Times of Primes is a fun and educational math game for kids. Practice prime factorization, roll dice, solve number challenges, and win the board through strategy and math skills!",
  keywords: [
    "math game for kids",
    "prime factorization game",
    "learn primes",
    "educational math game",
    "kids math board game",
    "number learning game",
    "Times of Primes",
  ],
  generator: "Times of Primes Math Game",

  icons: {
    icon: "/favicon.jpg",
    apple: "/favicon.jpg",
    shortcut: "/favicon.jpg",
  },

  openGraph: {
    title: "Times of Primes – Fun Math Game for Kids",
    description:
      "An exciting math board game where kids learn prime factorization through play, strategy, and dice rolls.",
    type: "website",
    images: [
      {
        url: "/dice-skins/owl.jpg",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Times of Primes – Math Game for Kids",
    description:
      "Learn prime numbers and factorization with a fun, strategic board game for kids!",
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
