import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Solcial - Social Media on Solana',
  description: 'Own your content. Own your earnings. Social media powered by Solana blockchain.',
  keywords: 'solana, social media, web3, blockchain, crypto, defi, socialfi',
  openGraph: {
    title: 'Solcial - Social Media on Solana',
    description: 'Own your content. Own your earnings.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solcial - Social Media on Solana',
    description: 'Own your content. Own your earnings.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
