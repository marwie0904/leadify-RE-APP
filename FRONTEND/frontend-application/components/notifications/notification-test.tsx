'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { notificationService, NotificationData } from '@/lib/services/notification-service'

export function NotificationTest() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationData['type']>('lead_created')
  const [priority, setPriority] = useState<NotificationData['priority']>('medium')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in both title and message')
      return
    }

    try {
      setIsCreating(true)
      
      const notification = await notificationService.createTestNotification(
        type,
        title,
        message,
        priority,
        {
          testData: true,
          timestamp: new Date().toISOString()
        }
      )

      toast.success('Test notification created successfully!')
      
      // Clear form
      setTitle('')
      setMessage('')
      
    } catch (error) {
      console.error('Failed to create test notification:', error)
      toast.error('Failed to create test notification')
    } finally {
      setIsCreating(false)
    }
  }

  const createPresetNotifications = async () => {
    const presets = [
      {
        type: 'lead_created' as const,
        title: 'New Lead Captured',
        message: 'John Doe submitted a contact form for 123 Main Street property',
        priority: 'high' as const
      },
      {
        type: 'lead_qualified' as const,
        title: 'Lead Qualified - High Priority',
        message: 'Sarah Johnson meets all BANT criteria: Budget $500K, Authority confirmed, Need immediate, Timeline 30 days',
        priority: 'urgent' as const
      },
      {
        type: 'conversation_started' as const,
        title: 'New Chat Conversation',
        message: 'Visitor started a conversation about downtown condos',
        priority: 'medium' as const
      },
      {
        type: 'system_announcement' as const,
        title: 'System Maintenance Complete',
        message: 'All systems are back online. New features are now available.',
        priority: 'low' as const
      }
    ]

    try {
      setIsCreating(true)
      
      for (const preset of presets) {
        await notificationService.createTestNotification(
          preset.type,
          preset.title,
          preset.message,
          preset.priority,
          { preset: true }
        )
        
        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      toast.success(`Created ${presets.length} test notifications!`)
      
    } catch (error) {
      console.error('Failed to create preset notifications:', error)
      toast.error('Failed to create preset notifications')
    } finally {
      setIsCreating(false)
    }
  }

  const typeOptions = [
    { value: 'lead_created', label: 'Lead Created', color: 'bg-green-100 text-green-800' },
    { value: 'lead_qualified', label: 'Lead Qualified', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'conversation_started', label: 'Conversation Started', color: 'bg-blue-100 text-blue-800' },
    { value: 'system_announcement', label: 'System Announcement', color: 'bg-purple-100 text-purple-800' },
    { value: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-800' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ]

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle>Notification System Test</CardTitle>
          <CardDescription>
            Create test notifications to verify the notification system is working properly.
            Check the notification center in the sidebar to see real-time updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title..."
                maxLength={100}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification message..."
                maxLength={500}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as NotificationData['type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={option.color}>
                            {option.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as NotificationData['priority'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={option.color}>
                            {option.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleCreateNotification}
                disabled={isCreating || !title.trim() || !message.trim()}
                className="flex-1"
              >
                {isCreating ? 'Creating...' : 'Create Test Notification'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={createPresetNotifications}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Presets'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong>Create a notification</strong> using the form above</p>
          <p>2. <strong>Check the sidebar</strong> - you should see a red badge with the notification count</p>
          <p>3. <strong>Click the notification center</strong> in the sidebar to view notifications</p>
          <p>4. <strong>Test filtering</strong> by type, priority, or read status</p>
          <p>5. <strong>Mark notifications as read</strong> or delete them</p>
          <p>6. <strong>Use "Create Presets"</strong> to test multiple notification types at once</p>
        </CardContent>
      </Card>
    </div>
  )
}