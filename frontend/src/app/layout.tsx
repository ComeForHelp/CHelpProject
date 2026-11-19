import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';
import { STAND_LABEL } from '@/shared/config/env';
import { Providers } from './providers';

/** Шрифты макета. next/font скачивает их при сборке и раздаёт сам — без запросов к Google из браузера. */
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});
const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Иду на помощь!', template: '%s — Иду на помощь!' },
  description: 'Бытовая помощь пожилым и маломобильным людям во Владивостоке',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#B94A00',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" {...mantineHtmlProps} className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        {/* Размер шрифта и версия для слабовидящих — до отрисовки, чтобы страница не «прыгала» */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=(JSON.parse(localStorage.getItem('chp-ui')||'{}').state)||{},h=document.documentElement,a=s.a11y;if(a&&a.enabled){h.setAttribute('data-a11y','');h.setAttribute('data-a11y-scheme',a.scheme||'bw');h.setAttribute('data-a11y-letter',a.letterSpacing||'normal');h.setAttribute('data-a11y-line',a.lineHeight||'normal');h.setAttribute('data-a11y-font',a.fontFamily||'sans');h.setAttribute('data-a11y-images',a.images||'on');h.style.fontSize=(a.fontSize||26)+'px'}else if(s.fontSize){h.style.fontSize=s.fontSize+'px'}}catch(e){}",
          }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Перейти к содержимому
        </a>
        {STAND_LABEL && (
          <div role="note" className="stand-banner">
            {STAND_LABEL}
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
