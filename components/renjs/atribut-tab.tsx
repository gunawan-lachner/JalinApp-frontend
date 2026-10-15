"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Loader2, AlertCircle, Database, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { rnaApi } from "@/lib/api"
import type { ConnectionProfile, ContainerPluginAttr } from "@/lib/types"

interface PluginInfo {
  id: number
  name: string
  plugin_id?: number
  container_id?: number
  comments?: string
}

export function AtributTab() {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [profileId, setProfileId] = useState("")
  const [pluginName, setPluginName] = useState("")
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plugin, setPlugin] = useState<PluginInfo | null>(null)
  const [attrs, setAttrs] = useState<ContainerPluginAttr[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const loadProfiles = async () => {
      setProfilesLoading(true)
      try {
        const res = await rnaApi.getConnectionProfiles()
        if (res.success && res.data) {
          const dbProfiles = res.data.filter(
            (p) => !p.connection_type || p.connection_type.toUpperCase() === "DB" || p.connection_type.toUpperCase() === "MYSQL",
          )
          setProfiles(dbProfiles.length > 0 ? dbProfiles : res.data)
        } else {
          setError(res.error || "Gagal memuat connection profiles")
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setProfilesLoading(false)
      }
    }
    loadProfiles()
  }, [])

  const filteredAttrs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return attrs
    return attrs.filter(
      (a) =>
        String(a.id).includes(q) ||
        String(a.container_plugin_id).includes(q) ||
        (a.field || "").toLowerCase().includes(q) ||
        (a.content || "").toLowerCase().includes(q),
    )
  }, [attrs, search])

  const handleLoad = async () => {
    if (!profileId) {
      toast({ title: "Profile wajib", description: "Pilih connection profile terlebih dahulu.", variant: "destructive" })
      return
    }
    if (!pluginName.trim()) {
      toast({
        title: "Nama plugin wajib",
        description: "Masukkan nama container_plugin untuk memuat atribut.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await rnaApi.renjsGetAttrs(profileId, pluginName.trim())
      if (res.success && res.data?.data) {
        setPlugin(res.data.data.plugin)
        setAttrs(res.data.data.attrs || [])
        toast({
          title: "Data dimuat",
          description: `${res.data.data.attrs?.length ?? 0} atribut ditemukan.`,
        })
      } else {
        const msg = res.error || res.data?.error || "Gagal memuat atribut"
        setError(msg)
        setPlugin(null)
        setAttrs([])
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setPlugin(null)
      setAttrs([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Connection Profile</Label>
          <Select value={profileId} onValueChange={setProfileId} disabled={profilesLoading}>
            <SelectTrigger>
              <SelectValue placeholder={profilesLoading ? "Memuat..." : "Pilih profile DB"} />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.name} value={p.name}>
                  {p.name}
                  {p.database ? ` (${p.database})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Container Plugin Name</Label>
          <Input
            value={pluginName}
            onChange={(e) => setPluginName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLoad()
            }}
            placeholder="contoh: ISSUER_ABC"
            className="font-mono text-sm"
          />
        </div>
        <Button onClick={handleLoad} disabled={loading || profilesLoading} className="w-full md:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Muat Atribut
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {plugin && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <Database className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">{plugin.name}</span>
          <Badge variant="secondary" className="bg-white text-blue-700 border-blue-200">
            ID {plugin.id}
          </Badge>
          {plugin.plugin_id != null && (
            <Badge variant="outline" className="text-xs">
              plugin_id {plugin.plugin_id}
            </Badge>
          )}
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">{attrs.length} atribut</Badge>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-700">container_plugin_attr</div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari field / content..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Memuat atribut...
            </div>
          ) : filteredAttrs.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-sm">
              {plugin
                ? search
                  ? "Tidak ada atribut yang cocok dengan pencarian."
                  : "Tidak ada atribut untuk plugin ini."
                : "Pilih profile dan nama container plugin, lalu muat data."}
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                    Plugin ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                    Field
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b">
                    Content
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAttrs.map((attr) => (
                  <tr key={attr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{attr.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {attr.container_plugin_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{attr.field}</td>
                    <td className="px-4 py-3 text-gray-800">
                      <span className="whitespace-pre-wrap break-all font-mono text-xs">{attr.content}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
