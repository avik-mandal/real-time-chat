"use client";
import "./globals.css";
import { ThemeProvider, createTheme } from "@mui/material";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true);
  const theme = createTheme({ palette: { mode: dark ? "dark" : "light" }});

  return (
    <html lang="en" className={dark ? "dark" : ""}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Chat App</title>
      </head>
      <body className="bg-gray-100 dark:bg-gray-900">
        <ThemeProvider theme={theme}>
          <button
            className="fixed top-4 right-4 z-50 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-medium flex items-center gap-2"
            onClick={() => setDark(!dark)}
            title="Toggle dark mode"
          >
            {dark ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark
              </>
            )}
          </button>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
