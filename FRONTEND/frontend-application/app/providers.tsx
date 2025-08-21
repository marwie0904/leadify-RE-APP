"use client"

import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageview capture, we'll handle it manually
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: false, // Set to true if you want to mask all inputs
      maskTextSelector: ".sensitive", // Add this class to sensitive elements
      blockClass: "ph-no-capture", // Add this class to block recording
      ignoreCSSAttributes: ["color"],
      recordCanvas: false,
      recordCrossOriginIframes: true,
    },
    autocapture: {
      dom_event_allowlist: ["click", "submit", "change"], // Capture these events
      css_selector_allowlist: ["[ph-capture]"], // Only capture elements with this attribute
    },
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") {
        console.log("PostHog loaded", posthog)
      }
    },
  })
}

export function PostHogPageview(): JSX.Element {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture("$pageview", {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return <></>
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}