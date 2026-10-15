"use client"
import { useState } from "react"
import {
  Monitor,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface SystemStats {
  cpu: number
  memory: number
  disk: number
  uptime: string
  activeConnections: number
  lastBackup: string
}

export function SystemSettingsTab() {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    cpu: 45,
    memory: 68,
    disk: 32,
    uptime: "7 days, 14 hours",
    activeConnections: 23,
    lastBackup: "2024-01-15T02:00:00Z",
  })

  const [settings, setSettings] = useState({
    maintenanceMode: false,
    debugMode: false,
    autoBackup: true,
    backupFrequency: "daily",
    logLevel: "info",
    maxConnections: "100",
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const refreshStats = async () => {
    setIsRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setSystemStats({
        ...systemStats,
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100),
        activeConnections: Math.floor(Math.random() * 50) + 10,
      })
      setIsRefreshing(false)
      toast({
        title: "Stats Refreshed",
        description: "System statistics have been updated.",
        variant: "default",
      })
    }, 1000)
  }

  const handleBackupNow = () => {
    toast({
      title: "Backup Started",
      description: "System backup has been initiated and will run in the background.",
      variant: "default",
    })
  }

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "System settings have been updated successfully.",
      variant: "default",
    })
  }

  const getStatusColor = (value: number) => {
    if (value < 50) return "text-green-600"
    if (value < 80) return "text-yellow-600"
    return "text-red-600"
  }

  const getProgressColor = (value: number) => {
    if (value < 50) return "bg-green-500"
    if (value < 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* System Performance */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Monitor className="h-5 w-5 text-blue-600" />
            <span>System Performance</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={isRefreshing}
            className="rounded-full bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(systemStats.cpu)}`}>{systemStats.cpu}%</span>
              </div>
              <Progress value={systemStats.cpu} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Memory</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(systemStats.memory)}`}>
                  {systemStats.memory}%
                </span>
              </div>
              <Progress value={systemStats.memory} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Disk Usage</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(systemStats.disk)}`}>{systemStats.disk}%</span>
              </div>
              <Progress value={systemStats.disk} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Connections</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{systemStats.activeConnections}</span>
              </div>
              <div className="text-xs text-gray-500">Active connections</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">System Uptime</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{systemStats.uptime}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Last Backup</span>
              </div>
              <p className="text-lg font-semibold text-gray-800">{formatDate(systemStats.lastBackup)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Configuration */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>System Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="logLevel" className="text-sm font-medium text-gray-700 mb-1 block">
                Log Level
              </Label>
              <Select
                value={settings.logLevel}
                onValueChange={(value) => setSettings({ ...settings, logLevel: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxConnections" className="text-sm font-medium text-gray-700 mb-1 block">
                Max Connections
              </Label>
              <Select
                value={settings.maxConnections}
                onValueChange={(value) => setSettings({ ...settings, maxConnections: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Maintenance Mode</Label>
                <p className="text-xs text-gray-500">Temporarily disable user access for maintenance</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Debug Mode</Label>
                <p className="text-xs text-gray-500">Enable detailed logging for troubleshooting</p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => setSettings({ ...settings, debugMode: checked })}
              />
            </div>
          </div>
          {settings.maintenanceMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Maintenance Mode Active</p>
                  <p>The system is currently in maintenance mode. Users will not be able to access the application.</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Maintenance */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Database className="h-5 w-5 text-blue-600" />
            <span>Backup & Maintenance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">Automatic Backup</Label>
              <p className="text-xs text-gray-500">Automatically backup system data</p>
            </div>
            <Switch
              checked={settings.autoBackup}
              onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
            />
          </div>
          {settings.autoBackup && (
            <div>
              <Label htmlFor="backupFrequency" className="text-sm font-medium text-gray-700 mb-1 block">
                Backup Frequency
              </Label>
              <Select
                value={settings.backupFrequency}
                onValueChange={(value) => setSettings({ ...settings, backupFrequency: value })}
              >
                <SelectTrigger className="rounded-full h-10 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <Button onClick={handleBackupNow} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
              <Database className="h-4 w-4 mr-2" />
              Backup Now
            </Button>
            <div className="text-sm text-gray-600">
              Last backup: <span className="font-medium">{formatDate(systemStats.lastBackup)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
