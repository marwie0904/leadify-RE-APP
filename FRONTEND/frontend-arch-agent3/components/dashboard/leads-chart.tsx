"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

interface LeadsChartProps {
  data: Array<{
    date: string
    leads: number
  }>
}

export function LeadsChart({ data }: LeadsChartProps) {
  const chartConfig = {
    leads: {
      label: "Leads",
      color: "hsl(var(--chart-1))",
    },
  }

  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }))

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Leads Overview</CardTitle>
        <CardDescription>Daily lead generation over time</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-leads)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-leads)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="displayDate" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="var(--color-leads)"
                fillOpacity={1}
                fill="url(#fillLeads)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
