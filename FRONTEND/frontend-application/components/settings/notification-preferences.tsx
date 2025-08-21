'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Monitor,
  Users,
  MessageSquare,
  AlertTriangle,
  Megaphone,
  Star,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { notificationService, NotificationPreferences } from '@/lib/services/notification-service'
import { cn } from '@/lib/utils'

const notificationTypes = [
  {
    key: 'lead_created',
    label: 'Lead Created',
    description: 'New leads captured from forms or chat',
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    defaultChannels: { email: true, push: false, inApp: true }
  },
  {
    key: 'lead_qualified',
    label: 'Lead Qualified',
    description: 'Leads that meet BANT qualification criteria',
    icon: Star,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    defaultChannels: { email: true, push: true, inApp: true }
  },
  {
    key: 'conversation_started',
    label: 'Conversation Started',
    description: 'New chat conversations initiated',
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    defaultChannels: { email: false, push: true, inApp: true }
  },
  {
    key: 'system_announcement',
    label: 'System Announcements',
    description: 'Important system updates and maintenance notices',
    icon: AlertTriangle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    defaultChannels: { email: true, push: true, inApp: true }
  },
  {
    key: 'marketing',
    label: 'Marketing Updates',
    description: 'Product updates, tips, and promotional content',
    icon: Megaphone,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    defaultChannels: { email: false, push: false, inApp: true }
  }
] as const

const channels = [
  {
    key: 'email',
    label: 'Email',
    description: 'Receive notifications via email',
    icon: Mail,
    color: 'text-orange-600'
  },
  {
    key: 'push',
    label: 'Push Notifications',
    description: 'Browser push notifications',
    icon: Smartphone,
    color: 'text-blue-600'
  },
  {
    key: 'inApp',
    label: 'In-App',
    description: 'Notifications within the application',
    icon: Monitor,
    color: 'text-green-600'
  }
] as const

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const prefs = await notificationService.getPreferences()
      
      // Ensure preferences have the correct structure
      if (prefs && prefs.types) {
        setPreferences(prefs)
      } else {
        // Set default preferences with proper structure
        const defaultPrefs: NotificationPreferences = {
          email: prefs?.email ?? true,
          push: prefs?.push ?? false,
          inApp: prefs?.inApp ?? true,
          types: notificationTypes.reduce((acc, type) => ({
            ...acc,
            [type.key]: type.defaultChannels
          }), {} as NotificationPreferences['types'])
        }
        setPreferences(defaultPrefs)
      }
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
      toast.error('Failed to load notification preferences')
      
      // Set default preferences if loading fails
      setPreferences({
        email: true,
        push: false,
        inApp: true,
        types: notificationTypes.reduce((acc, type) => ({
          ...acc,
          [type.key]: type.defaultChannels
        }), {} as NotificationPreferences['types'])
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return
    
    const newPreferences = { ...preferences, ...updates }
    setPreferences(newPreferences)
    setHasChanges(true)
  }

  const updateTypePreferences = (
    type: keyof NotificationPreferences['types'],
    channel: keyof NotificationPreferences['types'][keyof NotificationPreferences['types']],
    enabled: boolean
  ) => {
    if (!preferences) return
    
    // Ensure types object exists
    const currentTypes = preferences.types || {}
    const currentTypePrefs = currentTypes[type] || notificationTypes.find(t => t.key === type)?.defaultChannels || { email: false, push: false, inApp: false }
    
    const newPreferences = {
      ...preferences,
      types: {
        ...currentTypes,
        [type]: {
          ...currentTypePrefs,
          [channel]: enabled
        }
      }
    }
    setPreferences(newPreferences)
    setHasChanges(true)
  }

  const savePreferences = async () => {
    if (!preferences || !hasChanges) return

    try {
      setSaving(true)
      await notificationService.updatePreferences(preferences)
      setHasChanges(false)
      toast.success('Notification preferences saved successfully')
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    const defaultPreferences: NotificationPreferences = {
      email: true,
      push: false,
      inApp: true,
      types: notificationTypes.reduce((acc, type) => ({
        ...acc,
        [type.key]: type.defaultChannels
      }), {} as NotificationPreferences['types'])
    }
    
    setPreferences(defaultPreferences)
    setHasChanges(true)
    toast.info('Preferences reset to defaults')
  }

  if (isLoading) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Loading your notification preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Failed to load notification preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadPreferences}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure how and when you receive notifications for different types of events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Channel Settings */}
        <div>
          <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
          <div className="grid gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon
              return (
                <div key={channel.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", channel.color)} />
                    <div>
                      <Label className="text-sm font-medium">{channel.label}</Label>
                      <p className="text-xs text-muted-foreground">{channel.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[channel.key as keyof Omit<NotificationPreferences, 'types'>] as boolean}
                    onCheckedChange={(checked) => updatePreferences({ [channel.key]: checked })}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Per-Type Settings */}
        <div>
          <h3 className="text-lg font-medium mb-4">Notification Types</h3>
          <div className="space-y-4">
            {notificationTypes.map((type) => {
              const Icon = type.icon
              // Safely get type preferences with fallback to defaults
              const typePrefs = preferences.types?.[type.key] || type.defaultChannels
              
              return (
                <div key={type.key} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", type.bgColor)}>
                        <Icon className={cn("h-4 w-4", type.color)} />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">{type.label}</Label>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Object.values(typePrefs).filter(Boolean).length} channels enabled
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 ml-11">
                    {channels.map((channel) => (
                      <div key={`${type.key}-${channel.key}`} className="flex items-center space-x-2">
                        <Switch
                          id={`${type.key}-${channel.key}`}
                          checked={typePrefs[channel.key as keyof typeof typePrefs] ?? false}
                          onCheckedChange={(checked) => 
                            updateTypePreferences(type.key, channel.key as any, checked)
                          }
                          disabled={!preferences[channel.key as keyof Omit<NotificationPreferences, 'types'>]}
                        />
                        <Label 
                          htmlFor={`${type.key}-${channel.key}`}
                          className={cn(
                            "text-xs",
                            !preferences[channel.key as keyof Omit<NotificationPreferences, 'types'>] && "text-muted-foreground"
                          )}
                        >
                          {channel.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-xs">
                Unsaved changes
              </Badge>
            )}
            <Button 
              onClick={savePreferences}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}