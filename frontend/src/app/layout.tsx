import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Иду на помощь!', template: '%s — Иду на помощь!' },
  description: 'Бытовая помощь пожилым и маломобильным людям во Владивостоке',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1971c2',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        {/* Размер шрифта — до отрисовки, чтобы страница не «прыгала» */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var p=JSON.parse(localStorage.getItem('chp-ui')||'{}');var f=p.state&&p.state.fontSize;if(f)document.documentElement.style.fontSize=f+'px'}catch(e){}",
          }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Перейти к содержимому
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
