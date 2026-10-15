"use client"
import { useState } from "react"
import { Globe, Clock, Bell, Save, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export function GeneralSettingsTab() {
  const [settings, setSettings] = useState({
    appName: "Jalin Finance App",
    language: "en",
    timezone: "Asia/Jakarta",
    currency: "IDR",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    notifications: true,
    autoSave: true,
    autoSaveInterval: "5",
    theme: "light",
  })

  const { toast } = useToast()

  const handleSave = () => {
    // Here you would typically save to your backend
    toast({
      title: "Settings Saved",
      description: "Your general settings have been updated successfully.",
      variant: "default",
    })
  }

  const handleReset = () => {
    setSettings({
      appName: "Jalin Finance App",
      language: "en",
      timezone: "Asia/Jakarta",
      currency: "IDR",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      notifications: true,
      autoSave: true,
      autoSaveInterval: "5",
      theme: "light",
    })
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
      variant: "default",
    })
  }

  return (
    <div className="space-y-6">
      {/* Application Settings */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Globe className="h-5 w-5 text-blue-600" />
            <span>Application Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="appName" className="text-sm font-medium text-gray-700 mb-1 block">
                Application Name
              </Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="rounded-full h-10"
              />
            </div>
            <div>
              <Label htmlFor="language" className="text-sm font-medium text-gray-700 mb-1 block">
                Language
              </Label>
              <Select
                value={settings.language}
                onValueChange={(value) => setSettings({ ...settings, language: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Regional Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timezone" className="text-sm font-medium text-gray-700 mb-1 block">
                Timezone
              </Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings({ ...settings, timezone: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                  <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                  <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency" className="text-sm font-medium text-gray-700 mb-1 block">
                Currency
              </Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => setSettings({ ...settings, currency: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">Indonesian Rupiah (IDR)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFormat" className="text-sm font-medium text-gray-700 mb-1 block">
                Date Format
              </Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeFormat" className="text-sm font-medium text-gray-700 mb-1 block">
                Time Format
              </Label>
              <Select
                value={settings.timeFormat}
                onValueChange={(value) => setSettings({ ...settings, timeFormat: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hour</SelectItem>
                  <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Preferences */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>User Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">Enable Notifications</Label>
              <p className="text-xs text-gray-500">Receive system notifications and alerts</p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">Auto Save</Label>
              <p className="text-xs text-gray-500">Automatically save changes</p>
            </div>
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(checked) => setSettings({ ...settings, autoSave: checked })}
            />
          </div>
          {settings.autoSave && (
            <div>
              <Label htmlFor="autoSaveInterval" className="text-sm font-medium text-gray-700 mb-1 block">
                Auto Save Interval (minutes)
              </Label>
              <Select
                value={settings.autoSaveInterval}
                onValueChange={(value) => setSettings({ ...settings, autoSaveInterval: value })}
              >
                <SelectTrigger className="rounded-full h-10 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={handleReset} className="rounded-full bg-transparent">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
