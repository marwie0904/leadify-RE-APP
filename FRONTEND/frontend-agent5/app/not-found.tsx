import Link from 'next/link'
import { FileQuestion, Home, Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <FileQuestion className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
          <CardDescription className="text-base">
            Sorry, we couldn't find the page you're looking for.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</p>
          </div>
          
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Here are some helpful links:
            </h4>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <li>
                <Link href="/" className="hover:underline flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/agents" className="hover:underline flex items-center gap-2">
                  <span className="ml-6">Agents</span>
                </Link>
              </li>
              <li>
                <Link href="/conversations" className="hover:underline flex items-center gap-2">
                  <span className="ml-6">Conversations</span>
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:underline flex items-center gap-2">
                  <span className="ml-6">Analytics</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>The page might have been moved, deleted, or never existed.</p>
            <p className="mt-1">Please check the URL or navigate using the links above.</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/help">
              <Search className="mr-2 h-4 w-4" />
              Search Help Center
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}