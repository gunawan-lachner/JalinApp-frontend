import type { User } from "./types"

// Define the AuthUser interface based on the new API response
export interface AuthUser extends User {
  id: number
  username: string
  role_name: string // Corresponds to the new API structure
  id_role: number // Corresponds to the new API structure
  can_crud: boolean // NEW: CRUD permission
  last_login?: string | null
}

export interface LoginResponse {
  success: boolean
  message: string
  token: string
  user: AuthUser
}

export interface AllUsersResponse {
  success: boolean
  users: AuthUser[]
}

export interface Role {
  id_role: number
  role_name: string
}

export interface AllRolesResponse {
  success: boolean
  roles: Role[]
}

export interface CreateRoleRequest {
  role_name: string
}

export interface CreateRoleResponse {
  success: boolean
  message: string
  role: Role
}

export interface UpdateRoleRequest {
  role_name: string
}

export interface UpdateRoleResponse {
  success: boolean
  message: string
  role: Role
}

export interface DeleteRoleResponse {
  success: boolean
  message: string
}

// New interfaces for accessible pages
export interface AccessiblePage {
  id_page: number
  name: string
  path: string
}

export interface UserPagesResponse {
  success: boolean
  pages: AccessiblePage[]
}

class TokenManager {
  private token: string | null = null

  getToken(): string | null {
    if (typeof window !== "undefined" && !this.token) {
      this.token = localStorage.getItem("jwt_token")
    }
    return this.token
  }

  setToken(token: string): void {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("jwt_token", token)
    }
  }

  clearToken(): void {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("jwt_token")
    }
  }

  // New methods for CRUD permissions
  getCrudPermission(): boolean {
    if (typeof window !== "undefined") {
      const canCrud = localStorage.getItem("can_crud")
      return canCrud === "true"
    }
    return false
  }

  setCrudPermission(canCrud: boolean): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("can_crud", canCrud.toString())
    }
  }

  clearCrudPermission(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("can_crud")
    }
  }
}

export const tokenManager = new TokenManager()

class AuthApi {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = tokenManager.getToken()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true", // For ngrok local development
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options?.headers,
        },
        mode: "cors",
        credentials: "omit",
      })

      if (!response.ok) {
        let errorText = ""
        try {
          const errorData = await response.json()
          errorText = errorData.error || errorData.message || response.statusText
        } catch (e) {
          errorText = response.statusText
        }
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("API request failed:", error)
      return { success: false, error: error instanceof Error ? error.message : "Network error occurred" }
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
    if (response.success && response.data?.token) {
      tokenManager.setToken(response.data.token)
      // Save CRUD permission to localStorage
      if (response.data.user?.can_crud !== undefined) {
        tokenManager.setCrudPermission(response.data.user.can_crud)
      }
      return response.data
    }
    throw new Error(response.error || "Login failed")
  }

  async getCurrentUser(): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const response = await this.request<{ user: AuthUser }>("/auth/me")
    if (response.success && response.data?.user) {
      // Update CRUD permission in localStorage when fetching current user
      if (response.data.user.can_crud !== undefined) {
        tokenManager.setCrudPermission(response.data.user.can_crud)
      }
      return { success: true, user: response.data.user }
    }
    return { success: false, error: response.error || "Failed to fetch current user" }
  }

  async getUserPages(): Promise<{ success: boolean; data?: UserPagesResponse; error?: string }> {
    return this.request<UserPagesResponse>("/auth/user-pages")
  }

  async getAllUsers(): Promise<{ success: boolean; data?: AllUsersResponse; error?: string }> {
    return this.request<AllUsersResponse>("/auth/users")
  }

  async getAllRoles(): Promise<{ success: boolean; data?: AllRolesResponse; error?: string }> {
    return this.request<AllRolesResponse>("/auth/roles")
  }

  async createRole(
    roleData: CreateRoleRequest,
  ): Promise<{ success: boolean; data?: CreateRoleResponse; error?: string }> {
    return this.request<CreateRoleResponse>("/auth/roles", {
      method: "POST",
      body: JSON.stringify(roleData),
    })
  }

  async updateRole(
    roleId: number,
    roleData: UpdateRoleRequest,
  ): Promise<{ success: boolean; data?: UpdateRoleResponse; error?: string }> {
    return this.request<UpdateRoleResponse>(`/auth/roles/${roleId}`, {
      method: "PUT",
      body: JSON.stringify(roleData),
    })
  }

  async deleteRole(roleId: number): Promise<{ success: boolean; data?: DeleteRoleResponse; error?: string }> {
    return this.request<DeleteRoleResponse>(`/auth/roles/${roleId}`, {
      method: "DELETE",
    })
  }
}

export const authApi = new AuthApi(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000")
