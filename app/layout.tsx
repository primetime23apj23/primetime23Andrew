import React from "react"
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata = {
  title: "Times of Primes",
  description:
    "Times of Primes is a fun and educational math board game where players practice prime factorization, roll dice, solve number challenges, and win through strategy.",
  keywords: [
    "math game for kids",
    "prime factorization game",
    "learn primes",
    "educational math game",
    "kids math board game",
    "number learning game",
  ],
  generator: "Times of Primes",

  icons: {
    icon: "/favicon.jpg",
    apple: "/favicon.jpg",
    shortcut: "/favicon.jpg",
  },

  openGraph: {
    title: "Times of Primes",
    description:
      "An exciting math board game where kids learn prime factorization through play, strategy, and dice rolls.",
    type: "website",
  },

  twitter: {
    card: "summary",
    title: "Times of Primes",
    description:
      "Learn prime factorization with a fun, strategic board game for kids!",
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
