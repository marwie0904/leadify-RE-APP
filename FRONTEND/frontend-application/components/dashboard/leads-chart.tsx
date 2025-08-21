"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend, Area, ComposedChart } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Crown } from "lucide-react"

interface LeadsChartProps {
  data: Array<{
    date: string
    leads: number
    qualifiedLeads?: number
  }>
  subscription?: {
    plan?: string
    renewalDate?: string
    status?: string
  } | null
}

export function LeadsChart({ data, subscription }: LeadsChartProps) {
  const chartConfig = {
    leads: {
      label: "Total Leads",
      color: "#6366f1",
    },
    qualifiedLeads: {
      label: "Qualified Leads",
      color: "#f97316",
    },
  }

  // Generate 30 days of data if not enough is provided
  const generateFullMonthData = () => {
    const fullData = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const existingData = data.find(d => d.date.startsWith(dateStr))
      
      if (existingData) {
        fullData.push({
          ...existingData,
          date: dateStr,
          qualifiedLeads: existingData.qualifiedLeads ?? 0
        })
      } else {
        // Only add zero data for missing days to maintain 30-day view
        fullData.push({
          date: dateStr,
          leads: 0,
          qualifiedLeads: 0
        })
      }
    }
    
    return fullData
  }

  // Format data for display - show only day number
  const fullMonthData = generateFullMonthData()
  const formattedData = fullMonthData.map((item) => ({
    ...item,
    displayDate: new Date(item.date).getDate().toString(),
    qualifiedLeads: item.qualifiedLeads ?? 0
  }))

  return (
    <Card className="bg-white border-blue-100 shadow-sm h-full">
      <CardContent className="pl-[48px] pr-6 pt-6 pb-6">
        <div className="flex items-center gap-3">
          {/* Subscription Panel - Compact Square Version on Left of Chart */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 w-[200px] h-[240px] flex-shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Current Plan</span>
              <Crown className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-lg font-semibold">BETA TEST</div>
            <Badge className="bg-blue-100 text-blue-800 text-xs mt-3 w-fit">Beta</Badge>
            <div className="mt-auto pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic leading-relaxed">
                Testing phase - subscription plans not implemented
              </p>
            </div>
          </div>
          
          {/* Chart */}
          <div className="flex-1">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={formattedData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="1 0" 
                    stroke="#e0e0e0" 
                    vertical={true} 
                    horizontal={true}
                    strokeWidth={0.5}
                  />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#888888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickCount={8}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickCount={8}
                    allowDecimals={false}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '6px' }}
                    labelFormatter={(value) => {
                      const dataPoint = formattedData.find(d => d.displayDate === value)
                      if (dataPoint) {
                        return new Date(dataPoint.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })
                      }
                      return value
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    iconType="line"
                    layout="horizontal"
                    align="center"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }}
                  />
                  {/* Area fill for Total Leads */}
                  <Area
                    yAxisId="left"
                    type="natural"
                    dataKey="leads"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#colorLeads)"
                    fillOpacity={1}
                    dot={false}
                    name="Total"
                  />
                  {/* Line for Qualified Leads */}
                  <Line
                    yAxisId="right"
                    type="natural"
                    dataKey="qualifiedLeads"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={false}
                    name="Qualified"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}