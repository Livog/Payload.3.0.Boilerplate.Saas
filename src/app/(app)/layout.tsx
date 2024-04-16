import '@/app/style.css'

const Layout: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}

export default Layout
