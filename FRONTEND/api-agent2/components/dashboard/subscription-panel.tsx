import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Crown, Calendar } from "lucide-react"

interface SubscriptionPanelProps {
  subscription?: {
    plan?: string
    renewalDate?: string
    status?: string
  } | null
}

export function SubscriptionPanel({ subscription }: SubscriptionPanelProps) {
  // Provide default subscription data if none is provided
  const defaultSubscription = {
    plan: "Free Plan",
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    status: "active",
  }

  const sub = subscription || defaultSubscription

  const getStatusColor = (status?: string) => {
    if (!status || typeof status !== "string") {
      return "bg-gray-100 text-gray-800"
    }

    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800"
      case "expired":
        return "bg-red-100 text-red-800"
      case "trial":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString || typeof dateString !== "string") {
      return "No date available"
    }

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "Invalid date"
      }
      return date.toLocaleDateString()
    } catch {
      return "Invalid date"
    }
  }

  // Ensure we have safe values
  const safePlan = sub.plan || "Free Plan"
  const safeStatus = sub.status || "active"
  const safeRenewalDate = sub.renewalDate || defaultSubscription.renewalDate

  return (
    <Card className="min-w-[330px] w-full max-w-xs mx-auto shadow-lg border-2 border-primary/30">
      <CardHeader className="flex flex-col items-start justify-between space-y-2 pb-2 pt-4 px-6">
        <div className="flex flex-row items-center w-full justify-between">
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          <Crown className="h-4 w-4 text-yellow-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6 pt-2">
        <div className="flex flex-col items-start space-y-2">
          <div className="text-2xl font-bold">{safePlan}</div>
          <Badge className={getStatusColor(safeStatus)}>{safeStatus}</Badge>
        </div>
        <div className="flex items-center space-x-2 text-base text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <span>Renews on <span className="font-medium text-foreground">{formatDate(safeRenewalDate)}</span></span>
        </div>
        <Button className="w-full font-semibold py-2 mt-2" variant="outline">
          Manage Subscription
        </Button>
      </CardContent>
    </Card>
  )
}
