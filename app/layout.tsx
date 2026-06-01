import type { Metadata } from 'next'
import { Unbounded, DM_Sans, Cormorant_Garamond } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// Unbounded — display/headings
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

// DM Sans — UI, body, buttons
const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
})

// Cormorant Garamond — editorial serif for admin headlines (quiet luxury)
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  variable: '--font-serif',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'ChampionVPN — быстрый и безопасный VPN',
  description: 'ChampionVPN: надёжный VPN-сервис с протоколами VLESS и VMess. Безлимитный трафик, высокая скорость, серверы в 10+ странах.',
  openGraph: {
    title: 'ChampionVPN — быстрый и безопасный VPN',
    description: 'Надёжный VPN с протоколами VLESS/VMess. Безлимитный трафик, 10+ стран.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Viewport: viewport-fit=cover for iPhone notch + Telegram safe areas */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        {/* Telegram WebApp SDK — must load before app JS */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        {/* Inline init: ready + expand as early as possible */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var tg = window.Telegram && window.Telegram.WebApp;
              if (tg) { tg.ready(); tg.expand(); }
            } catch(e){}
          })();
        `}} />
      </head>
      <body className={`${unbounded.variable} ${dmSans.variable} ${cormorant.variable} font-body antialiased`} suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
