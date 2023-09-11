import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Frontend } from './[address]/frontend'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Redeeming your ENS',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>

        <nav className="bg-blue-600 p-4 text-white">
          <div className="container mx-auto">
            <h1 className="text-2xl font-semibold">ETHGlobal Redeem Tool</h1>
          </div>
        </nav>
        <Frontend>
          {children}
        </Frontend>
      </body>
    </html>
  )
}