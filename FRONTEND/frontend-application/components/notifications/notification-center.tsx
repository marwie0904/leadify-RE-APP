'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Bell, 
  Settings, 
  Check, 
  CheckCheck, 
  X, 
  AlertCircle, 
  AlertTriangle,
  Info,
  Circle,
  Trash2,
  Filter,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { notificationService, NotificationData } from '@/lib/services/notification-service'
import { useAuth } from '@/contexts/simple-auth-context'

interface NotificationCenterProps {
  isCollapsed?: boolean
}

export function NotificationCenter({ isCollapsed = false }: NotificationCenterProps) {
  const { getAuthHeaders } = useAuth()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<{
    type?: string
    priority?: string
    read?: boolean
  }>({})

  const setupRealtimeConnection = useCallback(async () => {
    try {
      await notificationService.startRealtimeConnection()
      
      // Listen for new notifications
      notificationService.on('notification', (newNotification: NotificationData) => {
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
      })

      // Listen for read notifications
      notificationService.on('notification-read', (updatedNotification: NotificationData) => {
        setNotifications(prev => 
          prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      })

      // Listen for all read
      notificationService.on('all-notifications-read', () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })))
        setUnreadCount(0)
      })

      // Listen for deleted notifications
      notificationService.on('notification-deleted', ({ id }: { id: string }) => {
        setNotifications(prev => {
          const notification = prev.find(n => n.id === id)
          const newNotifications = prev.filter(n => n.id !== id)
          
          if (notification && !notification.read) {
            setUnreadCount(prevCount => Math.max(0, prevCount - 1))
          }
          
          return newNotifications
        })
      })

    } catch (error) {
      console.error('Failed to setup Realtime connection:', error)
      toast.error('Failed to connect to notification system')
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await notificationService.getNotifications({
        limit: 50,
        ...filter
      })
      
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  // Initialize notification service
  useEffect(() => {
    notificationService.initialize(getAuthHeaders)
    
    // Load initial notifications
    loadNotifications()
    
    // Setup Realtime connection
    setupRealtimeConnection()

    return () => {
      notificationService.stopRealtimeConnection()
    }
  }, [getAuthHeaders, setupRealtimeConnection, loadNotifications])

  // Reload when filter changes
  useEffect(() => {
    loadNotifications()
  }, [filter, loadNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all notifications as read')
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId)
      toast.success('Notification deleted')
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const getPriorityIcon = (priority: NotificationData['priority']) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'medium':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'low':
        return <Circle className="h-4 w-4 text-gray-400" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getTypeColor = (type: NotificationData['type']) => {
    switch (type) {
      case 'lead_created':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'lead_qualified':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'conversation_started':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'system_announcement':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'marketing':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter.read !== undefined && notification.read !== filter.read) return false
    if (filter.type && notification.type !== filter.type) return false
    if (filter.priority && notification.priority !== filter.priority) return false
    return true
  })

  const NotificationItem = ({ notification }: { notification: NotificationData }) => (
    <div
      className={cn(
        "px-6 py-4 border-b border-border transition-colors hover:bg-muted/50",
        !notification.read && "bg-blue-50/50 border-l-4 border-l-blue-500"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getPriorityIcon(notification.priority)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate">{notification.title}</p>
              {!notification.read && (
                <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {notification.message}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getTypeColor(notification.type))}
                >
                  {notification.type.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(notification.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {!notification.read ? (
              <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                <Check className="mr-2 h-3 w-3" />
                Mark as read
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                <CheckCheck className="mr-2 h-3 w-3" />
                Already read
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteNotification(notification.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/10">
                  <Bell className="h-4 w-4 text-white" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-96 p-0">
                <div className="px-6 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleMarkAllAsRead}
                          className="h-6 text-xs"
                        >
                          Mark all read
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Filter className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                            checked={filter.read === false}
                            onCheckedChange={(checked) => 
                              setFilter(prev => ({ ...prev, read: checked ? false : undefined }))
                            }
                          >
                            Unread only
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuCheckboxItem
                                checked={filter.type === 'lead_created'}
                                onCheckedChange={(checked) => 
                                  setFilter(prev => ({ ...prev, type: checked ? 'lead_created' : undefined }))
                                }
                              >
                                Lead Created
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={filter.type === 'lead_qualified'}
                                onCheckedChange={(checked) => 
                                  setFilter(prev => ({ ...prev, type: checked ? 'lead_qualified' : undefined }))
                                }
                              >
                                Lead Qualified
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={filter.type === 'conversation_started'}
                                onCheckedChange={(checked) => 
                                  setFilter(prev => ({ ...prev, type: checked ? 'conversation_started' : undefined }))
                                }
                              >
                                Conversation
                              </DropdownMenuCheckboxItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                
                <ScrollArea className="h-96">
                  {isLoading ? (
                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No notifications found
                    </div>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/10">
            <Bell className="h-4 w-4 text-white" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-96 p-0">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleMarkAllAsRead}
                    className="h-6 text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Filter className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={filter.read === false}
                      onCheckedChange={(checked) => 
                        setFilter(prev => ({ ...prev, read: checked ? false : undefined }))
                      }
                    >
                      Unread only
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuCheckboxItem
                          checked={filter.type === 'lead_created'}
                          onCheckedChange={(checked) => 
                            setFilter(prev => ({ ...prev, type: checked ? 'lead_created' : undefined }))
                          }
                        >
                          Lead Created
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={filter.type === 'lead_qualified'}
                          onCheckedChange={(checked) => 
                            setFilter(prev => ({ ...prev, type: checked ? 'lead_qualified' : undefined }))
                          }
                        >
                          Lead Qualified
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={filter.type === 'conversation_started'}
                          onCheckedChange={(checked) => 
                            setFilter(prev => ({ ...prev, type: checked ? 'conversation_started' : undefined }))
                          }
                        >
                          Conversation
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No notifications found
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}