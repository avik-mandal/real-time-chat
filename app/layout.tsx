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
            className="fixed top-3 right-3 z-50 px-3 py-1 bg-sky-600 text-white rounded-full hover:bg-sky-700 transition-colors"
            onClick={() => setDark(!dark)}
          >
            {dark ? "Light" : "Dark"}
          </button>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
