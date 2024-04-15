import React from 'react'
import Providers from './providers'
import '@/app/style.css'
import { auth } from '@/lib/auth'

const Layout: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  const session = await auth()
  return (
    <Providers session={session}>
      <html>
        <body>{children}</body>
      </html>
    </Providers>
  )
}

export default Layout
