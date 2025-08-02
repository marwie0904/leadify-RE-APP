"use client"

export default function DebugEnvPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Debug</h1>
      <div className="space-y-2">
        <p><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || "NOT SET"}</p>
        <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET"}</p>
        <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        <p><strong>All NEXT_PUBLIC vars:</strong></p>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(
            Object.keys(process.env)
              .filter(key => key.startsWith('NEXT_PUBLIC'))
              .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {}),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  )
}