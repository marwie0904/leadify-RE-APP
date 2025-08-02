import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsProvider } from "@/contexts/settings-context"
import { AuthProvider } from "@/contexts/auth-context"
import ClientLayout from "./clientLayout"
import { ErrorBoundary } from "@/components/error-boundaries/error-boundary"
import { errorLogger } from "@/lib/error-logger"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "A comprehensive financial dashboard for managing your business",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ErrorBoundary
            onError={(error, errorInfo) => {
              errorLogger.log(error, errorInfo, {
                component: 'RootLayout',
                location: 'app-level'
              })
            }}
          >
            <AuthProvider>
              <SettingsProvider>
                <TooltipProvider delayDuration={0}>
                  <ClientLayout>{children}</ClientLayout>
                  <Toaster />
                </TooltipProvider>
              </SettingsProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
