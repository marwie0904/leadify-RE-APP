"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

export interface UserSettings {
  avatar: string
  fullName: string
  email: string
  phone: string
}

const defaultSettings: UserSettings = {
  avatar: "",
  fullName: "User Name",
  email: "user@example.com",
  phone: "+1 (555) 123-4567",
}

interface SettingsContextType {
  settings: UserSettings
  updateSettings: (newSettings: Partial<UserSettings>) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("userSettings")
      if (savedSettings) {
        return JSON.parse(savedSettings)
      }
    }
    return defaultSettings
  })

  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings))
  }, [settings])

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
