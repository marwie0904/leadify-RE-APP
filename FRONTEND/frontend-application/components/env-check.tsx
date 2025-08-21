"use client"

import { useEffect, useState } from "react"

export function EnvCheck() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})

  useEffect(() => {
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT_SET",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT_SET",
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "NOT_SET",
      NODE_ENV: process.env.NODE_ENV || "NOT_SET",
    })
  }, [])

  if (process.env.NODE_ENV === "production") {
    return null // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded text-xs z-50">
      <div className="font-bold">Environment Variables:</div>
      {Object.entries(envVars).map(([key, value]) => (
        <div key={key}>
          {key}: {value}
        </div>
      ))}
    </div>
  )
} 