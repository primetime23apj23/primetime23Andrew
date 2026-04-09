import React from "react"
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata = {
  title: "Andrew's Game Prime Factorization Game",
  description:
    "Andrew's Game Prime Factorization Game is a fun and educational math board game where players practice prime factorization, roll dice, solve number challenges, and win through strategy.",
  keywords: [
    "math game for kids",
    "prime factorization game",
    "Andrew's Game Prime Factorization Game",
    "learn primes",
    "educational math game",
    "kids math board game",
    "number learning game",
  ],
  generator: "Andrew's Game Prime Factorization Game",

  icons: {
    icon: "/favicon.jpg",
    apple: "/favicon.jpg",
    shortcut: "/favicon.jpg",
  },

  openGraph: {
    title: "Andrew's Game Prime Factorization Game",
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
    title: "Andrew's Game Prime Factorization Game",
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
