"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Database,
  RefreshCw,
  Wifi,
  AlertCircle,
  CheckCircle,
  Server,
  Key,
  User,
  Globe,
  Search,
  Tag,
  Layers,
  Plug,
  Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRnaApi } from "@/hooks/useRnaApi";
import type { ConnectionProfile } from "@/lib/types";
import { Sidebar } from "@/components/layout/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";

export default function ConnectionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState(pathname);

  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentProfile, setCurrentProfile] =
    useState<ConnectionProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [testStatus, setTestStatus] = useState<
    Record<string, "success" | "error" | "loading" | null>
  >({});
  const [filterType, setFilterType] = useState<string>("DB");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const api = useRnaApi();
  const { toast } = useToast();
  const { canCrud } = useCrudPermissions();

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveSection(href);
  };

  const fetchProfiles = () => {
    api.getConnectionProfiles(
      (data) => {
        setProfiles(data);
      },
      (error) => {
        console.error("Failed to fetch connection profiles:", error);
      }
    );
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleAddProfile = () => {
    if (!canCrud) return;
    setIsEditing(false);
    setCurrentProfile({
      name: "",
      category: "Development",
      connection_type: "DB",
      database: "",
      host: "",
      port: 3306,
      user: "",
      password: "",
    });
    setIsAddEditModalOpen(true);
  };

  const handleEditProfile = (profile: ConnectionProfile) => {
    if (!canCrud) return;
    setIsEditing(true);
    setCurrentProfile({ ...profile });
    setIsAddEditModalOpen(true);
  };

  const handleDeleteProfile = (profile: ConnectionProfile) => {
    if (!canCrud) return;
    setCurrentProfile(profile);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!canCrud || !currentProfile) return;

    api.deleteConnectionProfile(
      currentProfile.name,
      () => {
        fetchProfiles();
        setIsDeleteConfirmOpen(false);
        setCurrentProfile(null);
        toast({
          title: "Profile Deleted",
          description: `Connection profile "${currentProfile.name}" has been deleted.`,
          variant: "success",
        });
      },
      (error) => {
        console.error("Failed to delete profile:", error);
        toast({
          title: "Deletion Failed",
          description: `Failed to delete profile "${currentProfile.name}": ${error}.`,
          variant: "destructive",
        });
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCrud || !currentProfile) return;

    if (isEditing) {
      api.updateConnectionProfile(
        currentProfile.name,
        currentProfile,
        () => {
          fetchProfiles();
          setIsAddEditModalOpen(false);
          setCurrentProfile(null);
          toast({
            title: "Profile Updated",
            description: `Connection profile "${currentProfile.name}" has been updated.`,
            variant: "success",
          });
        },
        (error) => {
          console.error("Failed to update profile:", error);
          toast({
            title: "Update Failed",
            description: `Failed to update profile "${currentProfile.name}": ${error}.`,
            variant: "destructive",
          });
        }
      );
    } else {
      api.createConnectionProfile(
        currentProfile,
        () => {
          fetchProfiles();
          setIsAddEditModalOpen(false);
          setCurrentProfile(null);
          toast({
            title: "Profile Added",
            description: `Connection profile "${currentProfile.name}" has been added.`,
            variant: "success",
          });
        },
        (error) => {
          console.error("Failed to create profile:", error);
          toast({
            title: "Creation Failed",
            description: `Failed to create profile "${currentProfile.name}": ${error}.`,
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleTestConnection = (profile: ConnectionProfile) => {
    setTestStatus((prev) => ({ ...prev, [profile.name]: "loading" }));
    api.testConnectionProfile(
      profile.name,
      (data) => {
        setTestStatus((prev) => ({
          ...prev,
          [profile.name]: data.status === "success" ? "success" : "error",
        }));
        if (data.status === "success") {
          toast({
            title: "Connection Successful",
            description: `Successfully connected to ${profile.name}.`,
            variant: "success",
          });
        } else {
          toast({
            title: "Connection Failed",
            description: `Failed to connect to ${profile.name}. Please check the profile details.`,
            variant: "destructive",
          });
        }
      },
      (error) => {
        setTestStatus((prev) => ({ ...prev, [profile.name]: "error" }));
        console.error(`Test connection failed for ${profile.name}:`, error);
        toast({
          title: "Connection Failed",
          description: `Failed to connect to ${profile.name}: ${error}.`,
          variant: "destructive",
        });
      }
    );
  };

  const getTestStatusBadge = (profileName: string) => {
    const status = testStatus[profileName];
    if (!status) return null;
    if (status === "loading") {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Testing...
        </Badge>
      );
    }
    if (status === "success") {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    }
    if (status === "error") {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return null;
  };

  const filteredProfiles = profiles.filter((profile) => {
    const matchesType =
      filterType === "all" || profile.connection_type === filterType;
    const matchesSearch =
      searchTerm.trim() === "" ||
      Object.values(profile).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeSection={activeSection} onNavigate={handleNavigation} />

        <div className="flex-1">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Jalin App</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">Connections</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                Database Connections
              </h1>
              <p className="text-gray-600">
                Manage your database connection profiles for services.
              </p>
            </div>

            <Card className="shadow-sm border-0 rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Database className="h-5 w-5 text-blue-600" />
                  <span>Connection Profiles</span>
                </CardTitle>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search profiles..."
                      className="pl-10 w-[200px] rounded-xl"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px] rounded-xl">
                      <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="DB">Database</SelectItem>
                      <SelectItem value="SSH">SSH</SelectItem>
                      <SelectItem value="API">API</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddProfile}
                    disabled={!canCrud}
                    className={`rounded-full ${
                      !canCrud
                        ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-50"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                    title={
                      !canCrud
                        ? "You don't have permission to add profiles"
                        : "Add New Profile"
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Profile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {api.loading && profiles.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mr-3" />
                    <span>Loading profiles...</span>
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      No connection profiles found.
                    </p>
                    <p className="text-sm mt-2">
                      Click "Add New Profile" to get started or adjust filters.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProfiles.map((profile) => (
                      <Card
                        key={profile.name}
                        className="rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-base font-semibold text-gray-800 flex items-center space-x-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span>{profile.name}</span>
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="secondary"
                              className={`${
                                profile.connection_type === "DB"
                                  ? "bg-purple-100 text-purple-700"
                                  : profile.connection_type === "SSH"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                              } text-xs`}
                            >
                              {profile.connection_type}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`${
                                profile.category === "Production"
                                  ? "bg-red-100 text-red-700"
                                  : profile.category === "Development"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              } text-xs`}
                            >
                              {profile.category}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-gray-700">
                          <div className="flex items-center space-x-2">
                            <Server className="h-4 w-4 text-gray-500" />
                            <span>
                              <span className="font-medium">Host:</span>{" "}
                              {profile.host}:{profile.port}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-gray-500" />
                            <span>
                              <span className="font-medium">Database:</span>{" "}
                              {profile.database}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span>
                              <span className="font-medium">User:</span>{" "}
                              {profile.user}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Key className="h-4 w-4 text-gray-500" />
                            <span>
                              <span className="font-medium">Password:</span>{" "}
                              {"••••••••"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Status:</span>
                            {getTestStatusBadge(profile.name)}
                          </div>
                          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(profile)}
                              disabled={
                                api.loading &&
                                testStatus[profile.name] === "loading"
                              }
                              className="rounded-full text-xs"
                            >
                              {testStatus[profile.name] === "loading" ? (
                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Wifi className="h-3 w-3 mr-1" />
                              )}
                              Test
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProfile(profile)}
                              disabled={!canCrud}
                              className={`rounded-full text-xs ${
                                !canCrud ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                              title={
                                !canCrud
                                  ? "You don't have permission to edit profiles"
                                  : "Edit Profile"
                              }
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProfile(profile)}
                              disabled={!canCrud}
                              className={`rounded-full text-xs ${
                                !canCrud
                                  ? "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400"
                                  : ""
                              }`}
                              title={
                                !canCrud
                                  ? "You don't have permission to delete profiles"
                                  : "Delete Profile"
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add/Edit Profile Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader className="pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-semibold text-gray-800">
              {isEditing
                ? "Edit Connection Profile"
                : "Add New Connection Profile"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-6"
          >
            <div>
              <Label
                htmlFor="name"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <Tag className="h-4 w-4 text-gray-500" />
                Profile Name
              </Label>
              <Input
                id="name"
                value={currentProfile?.name || ""}
                onChange={(e) =>
                  setCurrentProfile({
                    ...currentProfile!,
                    name: e.target.value,
                  })
                }
                required
                disabled={isEditing}
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <Label
                htmlFor="category"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <Layers className="h-4 w-4 text-gray-500" />
                Category
              </Label>
              <Select
                value={currentProfile?.category || ""}
                onValueChange={(value) =>
                  setCurrentProfile({ ...currentProfile!, category: value })
                }
                required
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Staging">Staging</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Testing">Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="connection_type"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <Plug className="h-4 w-4 text-gray-500" />
                Connection Type
              </Label>
              <Select
                value={currentProfile?.connection_type || ""}
                onValueChange={(value) =>
                  setCurrentProfile({
                    ...currentProfile!,
                    connection_type: value,
                  })
                }
                required
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DB">Database</SelectItem>
                  <SelectItem value="SSH">SSH</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="host"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <Server className="h-4 w-4 text-gray-500" />
                Host
              </Label>
              <Input
                id="host"
                value={currentProfile?.host || ""}
                onChange={(e) =>
                  setCurrentProfile({
                    ...currentProfile!,
                    host: e.target.value,
                  })
                }
                required
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <Label
                htmlFor="port"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <Hash className="h-4 w-4 text-gray-500" />
                Port
              </Label>
              <Input
                id="port"
                type="number"
                value={currentProfile?.port || ""}
                onChange={(e) =>
                  setCurrentProfile({
                    ...currentProfile!,
                    port: Number(e.target.value),
                  })
                }
                required
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <Label
                htmlFor="database"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <Database className="h-4 w-4 text-gray-500" />
                Database
              </Label>
              <Input
                id="database"
                value={currentProfile?.database || ""}
                onChange={(e) =>
                  setCurrentProfile({
                    ...currentProfile!,
                    database: e.target.value,
                  })
                }
                required
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <Label
                htmlFor="user"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <User className="h-4 w-4 text-gray-500" />
                User
              </Label>
              <Input
                id="user"
                value={currentProfile?.user || ""}
                onChange={(e) =>
                  setCurrentProfile({
                    ...currentProfile!,
                    user: e.target.value,
                  })
                }
                required
                className="rounded-xl h-10"
              />
            </div>
            <div>
              <Label
                htmlFor="password"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"
              >
                <Key className="h-4 w-4 text-gray-500" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={currentProfile?.password || ""}
                onChange={(e) =>
                  setCurrentProfile({
                    ...currentProfile!,
                    password: e.target.value,
                  })
                }
                required
                className="rounded-xl h-10"
              />
            </div>
            <DialogFooter className="col-span-full pt-4 border-t border-gray-200 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsAddEditModalOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={api.loading || !canCrud}
                className={`rounded-full ${
                  !canCrud
                    ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-50"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                title={
                  !canCrud ? "You don't have permission to save changes" : ""
                }
              >
                {api.loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : isEditing ? (
                  <Edit className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isEditing ? "Save Changes" : "Add Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              Are you sure you want to delete the connection profile "
              <span className="font-medium text-red-600">
                {currentProfile?.name}
              </span>
              "? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={api.loading || !canCrud}
              className={`rounded-full ${
                !canCrud
                  ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-50"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              title={
                !canCrud ? "You don't have permission to delete profiles" : ""
              }
            >
              {api.loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
