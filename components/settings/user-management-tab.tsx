"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { authApi, tokenManager, type AuthUser, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RoleOption {
  id: number; // Corresponds to id_role from backend
  name: string; // Corresponds to role_name from backend
  label: string; // Display label for UI
  color: string; // Tailwind classes for badge color
}

// Define a static mapping for colors based on role_name
const ROLE_COLOR_MAP: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  user: "bg-blue-100 text-blue-800 border-blue-200",
  viewer: "bg-green-100 text-green-800 border-green-200",
  manager: "bg-purple-100 text-purple-800 border-purple-200",
  // Add more mappings as needed
  default: "bg-gray-100 text-gray-800 border-gray-200",
};

const ROLE_COLOR_MAP_SELECTED: Record<string, string> = {
  admin: "bg-red-600 text-white border-red-600",
  user: "bg-blue-600 text-white border-blue-600",
  viewer: "bg-green-600 text-white border-green-600",
  manager: "bg-purple-600 text-white border-purple-600",
  // Add more mappings as needed
  default: "bg-gray-600 text-white border-gray-600",
};

interface UserFormData {
  username: string;
  password: string;
  id_role: number; // Changed from user_level to id_role
}

interface CreateUserRequest {
  username: string;
  password: string;
  id_role: number; // Changed from user_level to id_role
}

interface UpdateUserRequest {
  username?: string;
  password?: string;
  id_role?: number; // Changed from user_level to id_role
}

interface RoleFormData {
  role_name: string;
  can_crud: boolean;
}

interface CreateRoleRequest {
  role_name: string;
  can_crud: boolean;
}

interface UpdateRoleRequest {
  role_name: string;
  can_crud: boolean;
}

export function UserManagementTab() {
  const { user: currentUser, isAuthenticated, checkAuth } = useAuth();

  // State management for Users
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: "",
    password: "",
    id_role: 0, // Will be set after roles are fetched
  });
  const [userFormLoading, setUserFormLoading] = useState(false);

  // State management for Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleDialog, setShowDeleteRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    role_name: "",
    can_crud: false,
  });
  const [roleFormLoading, setRoleFormLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if current user is admin
  const isAdmin = currentUser?.role_name === "admin";

  // Generic API call function for user and role management
  const authApiCall = useCallback(
    async <T,>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        const token = tokenManager.getToken();
        if (!token) {
          throw new Error("No authentication token found");
        }

        const fullUrl = `${
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
        }${endpoint}`;

        const response = await fetch(fullUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
            ...options.headers,
          },
          mode: "cors",
          credentials: "omit",
        });

        if (!response.ok) {
          let errorText = "";
          try {
            const errorData = await response.json();
            errorText =
              errorData.error || errorData.message || response.statusText;
          } catch (e) {
            errorText = response.statusText;
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return { success: true, data };
      } catch (err) {
        console.error("API call failed:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error occurred",
        };
      }
    },
    []
  );

  // Fetch all users with JWT authentication
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setLoadingUsers(false);
      return;
    }

    try {
      setLoadingUsers(true);
      setError("");
      const response = await authApi.getAllUsers();

      if (response.success && response.data?.users) {
        setUsers(response.data.users);
        setSuccess(`Successfully loaded ${response.data.users.length} users`);
      } else {
        const errorMsg = response.error || "Failed to fetch users";
        setError(errorMsg);
        if (errorMsg.includes("Authentication") || errorMsg.includes("401")) {
          await checkAuth();
        }
      }
    } catch (err) {
      setError("Network error occurred while fetching users");
    } finally {
      setLoadingUsers(false);
    }
  }, [isAuthenticated, isAdmin, checkAuth]);

  // Fetch all roles with JWT authentication
  const fetchRoles = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setLoadingRoles(false);
      return;
    }

    try {
      setLoadingRoles(true);
      setError("");
      const response = await authApi.getAllRoles();

      if (response.success && response.data?.roles) {
        setRoles(response.data.roles);
        // Set default role for user creation if not already set
        if (userFormData.id_role === 0 && response.data.roles.length > 0) {
          setUserFormData((prev) => ({
            ...prev,
            id_role: response.data.roles[0].id_role,
          }));
        }
        setSuccess(`Successfully loaded ${response.data.roles.length} roles`);
      } else {
        const errorMsg = response.error || "Failed to fetch roles";
        setError(errorMsg);
        if (errorMsg.includes("Authentication") || errorMsg.includes("401")) {
          await checkAuth();
        }
      }
    } catch (err) {
      setError("Network error occurred while fetching roles");
    } finally {
      setLoadingRoles(false);
    }
  }, [isAuthenticated, isAdmin, checkAuth, userFormData.id_role]);

  // Create user
  const handleCreateUser = async () => {
    if (
      !userFormData.username ||
      !userFormData.password ||
      userFormData.id_role === 0
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setUserFormLoading(true);
      setError("");
      const createUserData: CreateUserRequest = {
        username: userFormData.username,
        password: userFormData.password,
        id_role: userFormData.id_role,
      };

      const response = await authApiCall<{ user: AuthUser; message: string }>(
        "/auth/users",
        {
          method: "POST",
          body: JSON.stringify(createUserData),
        }
      );

      if (response.success) {
        setSuccess("User created successfully");
        setShowCreateUserModal(false);
        resetUserForm();
        await fetchUsers();
      } else {
        setError(response.error || "Failed to create user");
      }
    } catch (err) {
      setError("Network error occurred while creating user");
    } finally {
      setUserFormLoading(false);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser || !userFormData.username || userFormData.id_role === 0) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setUserFormLoading(true);
      setError("");
      const updateData: UpdateUserRequest = {
        username: userFormData.username,
        id_role: userFormData.id_role,
      };
      if (userFormData.password) {
        updateData.password = userFormData.password;
      }

      const response = await authApiCall<{ message: string }>(
        `/auth/users/${selectedUser.id}`,
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      if (response.success) {
        setSuccess("User updated successfully");
        setShowEditUserModal(false);
        resetUserForm();
        await fetchUsers();
      } else {
        setError(response.error || "Failed to update user");
      }
    } catch (err) {
      setError("Network error occurred while updating user");
    } finally {
      setUserFormLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setUserFormLoading(true);
      setError("");
      const response = await authApiCall<{ message: string }>(
        `/auth/users/${selectedUser.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        setSuccess("User deleted successfully");
        setShowDeleteUserDialog(false);
        setSelectedUser(null);
        await fetchUsers();
      } else {
        setError(response.error || "Failed to delete user");
      }
    } catch (err) {
      setError("Network error occurred while deleting user");
    } finally {
      setUserFormLoading(false);
    }
  };

  // Create role
  const handleCreateRole = async () => {
    if (!roleFormData.role_name) {
      setError("Please fill in the role name");
      return;
    }

    try {
      setRoleFormLoading(true);
      setError("");
      const createRoleData: CreateRoleRequest = {
        role_name: roleFormData.role_name,
        can_crud: roleFormData.can_crud,
      };

      const response = await authApi.createRole(createRoleData);

      if (response.success) {
        setSuccess(
          `Role "${response.data?.role.role_name}" created successfully`
        );
        setShowCreateRoleModal(false);
        resetRoleForm();
        await fetchRoles();
      } else {
        setError(response.error || "Failed to create role");
      }
    } catch (err) {
      setError("Network error occurred while creating role");
    } finally {
      setRoleFormLoading(false);
    }
  };

  // Update role
  const handleUpdateRole = async () => {
    if (!selectedRole || !roleFormData.role_name) {
      setError("Please fill in the role name");
      return;
    }

    try {
      setRoleFormLoading(true);
      setError("");
      const updateRoleData: UpdateRoleRequest = {
        role_name: roleFormData.role_name,
        can_crud: roleFormData.can_crud,
      };

      const response = await authApi.updateRole(
        selectedRole.id_role,
        updateRoleData
      );

      if (response.success) {
        setSuccess(
          `Role "${response.data?.role.role_name}" updated successfully`
        );
        setShowEditRoleModal(false);
        resetRoleForm();
        await fetchRoles();
      } else {
        setError(response.error || "Failed to update role");
      }
    } catch (err) {
      setError("Network error occurred while updating role");
    } finally {
      setRoleFormLoading(false);
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      setRoleFormLoading(true);
      setError("");
      const response = await authApi.deleteRole(selectedRole.id_role);

      if (response.success) {
        setSuccess(`Role "${selectedRole.role_name}" deleted successfully`);
        setShowDeleteRoleDialog(false);
        setSelectedRole(null);
        await fetchRoles();
      } else {
        setError(response.error || "Failed to delete role");
      }
    } catch (err) {
      setError("Network error occurred while deleting role");
    } finally {
      setRoleFormLoading(false);
    }
  };

  // Reset user form
  const resetUserForm = () => {
    setUserFormData({
      username: "",
      password: "",
      id_role: roles[0]?.id_role || 0, // Reset to first available role ID
    });
    setSelectedUser(null);
    setError("");
  };

  // Reset role form
  const resetRoleForm = () => {
    setRoleFormData({
      role_name: "",
      can_crud: false,
    });
    setSelectedRole(null);
    setError("");
  };

  // Open edit user modal
  const openEditUserModal = (user: AuthUser) => {
    setSelectedUser(user);
    setUserFormData({
      username: user.username,
      password: "", // Password is not pre-filled for security
      id_role: user.id_role,
    });
    setShowEditUserModal(true);
  };

  // Open delete user dialog
  const openDeleteUserDialog = (user: AuthUser) => {
    setSelectedUser(user);
    setShowDeleteUserDialog(true);
  };

  // Open edit role modal
  const openEditRoleModal = (role: Role) => {
    setSelectedRole(role);
    setRoleFormData({
      role_name: role.role_name,
      can_crud: role.can_crud,
    });
    setShowEditRoleModal(true);
  };

  // Open delete role dialog
  const openDeleteRoleDialog = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteRoleDialog(true);
  };

  // Filter users based on search term (removed search input, so this is just all users)
  const filteredUsers = users;

  // Get role badge color
  const getRoleColor = (roleName: string) => {
    return ROLE_COLOR_MAP[roleName] || ROLE_COLOR_MAP.default;
  };

  // Get role badge color for selected state
  const getRoleColorSelected = (roleName: string) => {
    return ROLE_COLOR_MAP_SELECTED[roleName] || ROLE_COLOR_MAP_SELECTED.default;
  };

  // Get role label (using role_name as label for now, can be extended)
  const getRoleLabel = (roleName: string) => {
    // If you want custom labels for roles, you'd map them here
    return (
      roleName.charAt(0).toUpperCase() + roleName.slice(1).replace(/_/g, " ")
    );
  };

  // Handle role selection for user form
  const handleRoleSelect = (roleId: number) => {
    setUserFormData((prev) => ({ ...prev, id_role: roleId }));
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch users and roles when component mounts or auth state changes
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchRoles(); // Fetch roles first as users depend on them
      fetchUsers();
    }
  }, [isAuthenticated, isAdmin, fetchUsers, fetchRoles]);

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Admin Access Required
        </h3>
        <p className="text-gray-600">
          You need administrator privileges to manage users and roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchUsers();
              fetchRoles();
            }}
            className="rounded-full border-red-300 text-red-700 hover:bg-red-100 bg-transparent"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* User Management Section */}
        <div className="flex-1 space-y-6">
          {/* Users Table */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">
                  System Users ({filteredUsers.length})
                </h3>
              </div>
              <Button
                onClick={() => setShowCreateUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700 rounded-full"
                disabled={loadingUsers || roles.length === 0} // Disable if no roles are loaded
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
            <div className="p-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading users...</p>
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No users found</p>
                  {error && (
                    <Button
                      variant="outline"
                      onClick={fetchUsers}
                      className="mt-4 rounded-full border-gray-300 bg-transparent"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Loading
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          User
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Access Level
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="bg-gray-100 rounded-full p-2 w-10 h-10 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.username}
                                </p>
                                <p className="text-sm text-gray-500">
                                  ID: {user.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(
                                user.role_name
                              )}`}
                            >
                              {getRoleLabel(user.role_name)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditUserModal(user)}
                                className="rounded-full border-gray-300"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {user.id !== currentUser?.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteUserDialog(user)}
                                  className="rounded-full border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Role Management Section */}
        <div className="flex-1 space-y-6">
          <div className="bg-gray-50 rounded-2xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Role Management ({roles.length})
                </h3>
              </div>
              <Button
                onClick={() => setShowCreateRoleModal(true)}
                className="bg-blue-600 hover:bg-blue-700 rounded-full"
                disabled={loadingRoles}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </div>
            <div className="p-4">
              {loadingRoles ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading roles...</p>
                  </div>
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-12">
                  <KeyRound className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No roles found</p>
                  {error && (
                    <Button
                      variant="outline"
                      onClick={fetchRoles}
                      className="mt-4 rounded-full border-gray-300 bg-transparent"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Loading
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Role Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          ID
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Access
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => (
                        <tr
                          key={role.id_role}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-4 px-4">
                            <div
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(
                                role.role_name
                              )}`}
                            >
                              {getRoleLabel(role.role_name)}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {role.id_role}
                          </td>
                          <td className="py-4 px-4">
                            {role.can_crud ? (
                              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                Full Access
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                Read Only
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditRoleModal(role)}
                                className="rounded-full border-gray-300"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {/* Prevent deleting admin role or roles that are currently assigned to any user */}
                              {role.role_name !== "admin" &&
                                !users.some(
                                  (user) => user.id_role === role.id_role
                                ) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteRoleDialog(role)}
                                    className="rounded-full border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with specified access level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                value={userFormData.username}
                onChange={(e) =>
                  setUserFormData((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                placeholder="Enter username"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={userFormData.password}
                onChange={(e) =>
                  setUserFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Enter password"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label>Access Level</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((role) => (
                  <button
                    key={role.id_role}
                    type="button"
                    onClick={() => handleRoleSelect(role.id_role)}
                    className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105 ${
                      userFormData.id_role === role.id_role
                        ? getRoleColorSelected(role.role_name)
                        : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
                    }`}
                  >
                    {getRoleLabel(role.role_name)}
                  </button>
                ))}
              </div>
              {userFormData.id_role === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Please select an access level
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateUserModal(false);
                resetUserForm();
              }}
              disabled={userFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={userFormLoading || roles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {userFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and access level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={userFormData.username}
                onChange={(e) =>
                  setUserFormData((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                placeholder="Enter username"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">
                Password (leave empty to keep current)
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={userFormData.password}
                onChange={(e) =>
                  setUserFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Enter new password"
                className="rounded-full border-gray-300"
              />
            </div>
            <div>
              <Label>Access Level</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((role) => (
                  <button
                    key={role.id_role}
                    type="button"
                    onClick={() => handleRoleSelect(role.id_role)}
                    className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105 ${
                      userFormData.id_role === role.id_role
                        ? getRoleColorSelected(role.role_name)
                        : "border-gray-300 text-gray-700 bg-white hover:border-gray-400"
                    }`}
                  >
                    {getRoleLabel(role.role_name)}
                  </button>
                ))}
              </div>
              {userFormData.id_role === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Please select an access level
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditUserModal(false);
                resetUserForm();
              }}
              disabled={userFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={userFormLoading || roles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {userFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog
        open={showDeleteUserDialog}
        onOpenChange={setShowDeleteUserDialog}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user "{selectedUser?.username}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={userFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={userFormLoading}
              className="bg-red-600 hover:bg-red-700 rounded-full"
            >
              {userFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Role Modal */}
      <Dialog open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new access role to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-role-name">Role Name</Label>
              <Input
                id="create-role-name"
                value={roleFormData.role_name}
                onChange={(e) =>
                  setRoleFormData((prev) => ({
                    ...prev,
                    role_name: e.target.value,
                  }))
                }
                placeholder="e.g., manager, editor"
                className="rounded-full border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-role-crud">
                  Create, Update & Delete Permissions
                </Label>
                <p className="text-sm text-gray-500">
                  Allow this role to create, update and delete data
                </p>
              </div>
              <Switch
                id="create-role-crud"
                checked={roleFormData.can_crud}
                onCheckedChange={(checked) =>
                  setRoleFormData((prev) => ({ ...prev, can_crud: checked }))
                }
              />
            </div>
            {/* Preview */}
            {roleFormData.role_name && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 flex items-center space-x-3">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(
                      roleFormData.role_name
                    )}`}
                  >
                    {getRoleLabel(roleFormData.role_name)}
                  </div>
                  {roleFormData.can_crud ? (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      Full Access
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Read Only
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateRoleModal(false);
                resetRoleForm();
              }}
              disabled={roleFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={roleFormLoading}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {roleFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={showEditRoleModal} onOpenChange={setShowEditRoleModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role name and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                value={roleFormData.role_name}
                onChange={(e) =>
                  setRoleFormData((prev) => ({
                    ...prev,
                    role_name: e.target.value,
                  }))
                }
                placeholder="Enter new role name"
                className="rounded-full border-gray-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-role-crud">
                  Create, Update & Delete Permissions
                </Label>
                <p className="text-sm text-gray-500">
                  Allow this role to create, update and delete data
                </p>
              </div>
              <Switch
                id="edit-role-crud"
                checked={roleFormData.can_crud}
                onCheckedChange={(checked) =>
                  setRoleFormData((prev) => ({ ...prev, can_crud: checked }))
                }
              />
            </div>
            {/* Preview */}
            {roleFormData.role_name && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 flex items-center space-x-3">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(
                      roleFormData.role_name
                    )}`}
                  >
                    {getRoleLabel(roleFormData.role_name)}
                  </div>
                  {roleFormData.can_crud ? (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      Full Access
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Read Only
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditRoleModal(false);
                resetRoleForm();
              }}
              disabled={roleFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={roleFormLoading}
              className="bg-blue-600 hover:bg-blue-700 rounded-full"
            >
              {roleFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <AlertDialog
        open={showDeleteRoleDialog}
        onOpenChange={setShowDeleteRoleDialog}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete role "{selectedRole?.role_name}"?
              This action cannot be undone.
              <br />
              **Note:** You cannot delete roles that are currently assigned to
              any user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={roleFormLoading}
              className="rounded-full border-gray-300"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={roleFormLoading}
              className="bg-red-600 hover:bg-red-700 rounded-full"
            >
              {roleFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Role"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
