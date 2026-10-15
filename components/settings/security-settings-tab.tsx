"use client"

import type React from "react"
import { useState } from "react"
import { Shield, Lock, Eye, EyeOff, Key, Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export function SecuritySettingsTab() {
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: "8",
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpiry: "90",
  })

  const [sessionSettings, setSessionSettings] = useState({
    sessionTimeout: "30",
    maxConcurrentSessions: "3",
    requireReauth: true,
  })

  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [twoFactor, setTwoFactor] = useState({
    enabled: false,
    method: "app",
  })

  const { toast } = useToast()

  const handleSavePolicy = () => {
    toast({
      title: "Password Policy Updated",
      description: "Password policy settings have been saved successfully.",
      variant: "default",
    })
  }

  const handleSaveSession = () => {
    toast({
      title: "Session Settings Updated",
      description: "Session security settings have been saved successfully.",
      variant: "default",
    })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
      variant: "default",
    })
    setPasswordChange({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="space-y-6">
      {/* Password Policy */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Lock className="h-5 w-5 text-blue-600" />
            <span>Password Policy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minLength" className="text-sm font-medium text-gray-700 mb-1 block">
                Minimum Password Length
              </Label>
              <Select
                value={passwordPolicy.minLength}
                onValueChange={(value) => setPasswordPolicy({ ...passwordPolicy, minLength: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 characters</SelectItem>
                  <SelectItem value="8">8 characters</SelectItem>
                  <SelectItem value="10">10 characters</SelectItem>
                  <SelectItem value="12">12 characters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="passwordExpiry" className="text-sm font-medium text-gray-700 mb-1 block">
                Password Expiry (days)
              </Label>
              <Select
                value={passwordPolicy.passwordExpiry}
                onValueChange={(value) => setPasswordPolicy({ ...passwordPolicy, passwordExpiry: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Require Uppercase Letters</Label>
                <p className="text-xs text-gray-500">Password must contain at least one uppercase letter</p>
              </div>
              <Switch
                checked={passwordPolicy.requireUppercase}
                onCheckedChange={(checked) => setPasswordPolicy({ ...passwordPolicy, requireUppercase: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Require Lowercase Letters</Label>
                <p className="text-xs text-gray-500">Password must contain at least one lowercase letter</p>
              </div>
              <Switch
                checked={passwordPolicy.requireLowercase}
                onCheckedChange={(checked) => setPasswordPolicy({ ...passwordPolicy, requireLowercase: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Require Numbers</Label>
                <p className="text-xs text-gray-500">Password must contain at least one number</p>
              </div>
              <Switch
                checked={passwordPolicy.requireNumbers}
                onCheckedChange={(checked) => setPasswordPolicy({ ...passwordPolicy, requireNumbers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Require Special Characters</Label>
                <p className="text-xs text-gray-500">Password must contain at least one special character</p>
              </div>
              <Switch
                checked={passwordPolicy.requireSpecialChars}
                onCheckedChange={(checked) => setPasswordPolicy({ ...passwordPolicy, requireSpecialChars: checked })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSavePolicy} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
              Save Policy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Security */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Session Security</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sessionTimeout" className="text-sm font-medium text-gray-700 mb-1 block">
                Session Timeout (minutes)
              </Label>
              <Select
                value={sessionSettings.sessionTimeout}
                onValueChange={(value) => setSessionSettings({ ...sessionSettings, sessionTimeout: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="maxSessions" className="text-sm font-medium text-gray-700 mb-1 block">
                Max Concurrent Sessions
              </Label>
              <Select
                value={sessionSettings.maxConcurrentSessions}
                onValueChange={(value) => setSessionSettings({ ...sessionSettings, maxConcurrentSessions: value })}
              >
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 session</SelectItem>
                  <SelectItem value="3">3 sessions</SelectItem>
                  <SelectItem value="5">5 sessions</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">Require Re-authentication</Label>
              <p className="text-xs text-gray-500">Require password for sensitive operations</p>
            </div>
            <Switch
              checked={sessionSettings.requireReauth}
              onCheckedChange={(checked) => setSessionSettings({ ...sessionSettings, requireReauth: checked })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveSession} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Key className="h-5 w-5 text-blue-600" />
            <span>Change Password</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 mb-1 block">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordChange.currentPassword}
                  onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                  required
                  className="rounded-full h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("current")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 mb-1 block">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordChange.newPassword}
                  onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                  required
                  className="rounded-full h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-1 block">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordChange.confirmPassword}
                  onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                  required
                  className="rounded-full h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="shadow-sm border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Two-Factor Authentication</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</Label>
              <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <Switch
              checked={twoFactor.enabled}
              onCheckedChange={(checked) => setTwoFactor({ ...twoFactor, enabled: checked })}
            />
          </div>
          {twoFactor.enabled && (
            <div>
              <Label htmlFor="twoFactorMethod" className="text-sm font-medium text-gray-700 mb-1 block">
                Authentication Method
              </Label>
              <Select value={twoFactor.method} onValueChange={(value) => setTwoFactor({ ...twoFactor, method: value })}>
                <SelectTrigger className="rounded-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">Authenticator App</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {twoFactor.enabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Setup Required</p>
                  <p>You need to configure your two-factor authentication method before it becomes active.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
