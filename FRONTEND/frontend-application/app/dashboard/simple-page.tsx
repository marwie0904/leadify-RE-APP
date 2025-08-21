"use client"

export default function SimpleDashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Test</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-4 rounded border">
          <h3>Test Card 1</h3>
          <p>This is a test</p>
        </div>
        <div className="bg-white p-4 rounded border">
          <h3>Test Card 2</h3>
          <p>This is also a test</p>
        </div>
      </div>
    </div>
  )
}