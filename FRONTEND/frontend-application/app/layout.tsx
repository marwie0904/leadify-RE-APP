import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsProvider } from "@/contexts/settings-context"
import { SimpleAuthProvider as AuthProvider } from "@/contexts/simple-auth-context"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { QueryProvider } from "@/lib/queries/query-provider"
import ClientLayout from "./clientLayout"
import dynamic from "next/dynamic"
import { PHProvider, PostHogPageview } from "./providers"
import { Suspense } from "react"

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
        <PHProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <AuthProvider>
              <QueryProvider>
                <SettingsProvider>
                  <SidebarProvider>
                    <TooltipProvider delayDuration={0}>
                      <ClientLayout>{children}</ClientLayout>
                      <Toaster />
                    </TooltipProvider>
                  </SidebarProvider>
                </SettingsProvider>
              </QueryProvider>
            </AuthProvider>
          </ThemeProvider>
          <Suspense>
            <PostHogPageview />
          </Suspense>
        </PHProvider>
      </body>
    </html>
  )
}
