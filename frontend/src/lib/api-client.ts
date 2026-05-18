import { getAuthTokenFromBridge } from "@/lib/auth-token-bridge"
import { clearSynapseTokenCookie } from "@/lib/cookies"

// ——— Types aligned with FastAPI JSON (snake_case) ———

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface User {
  id: string
  email: string
  display_name: string
  role: string
  permission_tags: string[]
}

export interface QueryRequestBody {
  query: string
  stream?: boolean
}

export interface QueryMetadata {
  top_similarity_score: number
  chunks_retrieved: number
  graph_nodes_used: number
  model: string
}

export interface Citation {
  title: string
  source_type: string
  source_url: string
  author: string
  timestamp: string
  relevance_score: number
}

export interface Expert {
  name: string
  email: string
  job_title: string
  relevance_score: number
  slack_member_id?: string
}

export interface QueryResponse {
  answer: string
  citations: Citation[]
  expert: Expert | null
  is_low_confidence: boolean
  metadata: QueryMetadata
}

export interface StreamCompletePayload {
  citations: Citation[]
  expert: Expert | null
  confidence: number
}

export interface StreamCallbacks {
  onRetrieval: (chunkCount: number) => void
  onToken: (token: string) => void
  onComplete: (data: StreamCompletePayload) => void
  onError: (message: string) => void
}

export interface Source {
  id: string
  name: string
  source_type: string
  status: string
  sync_schedule: string | null
  default_permission_tags: string[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface SourceJob {
  id: string
  source_id: string
  status: string
  documents_processed: number
  chunks_processed: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface CreateSourceRequest {
  source_type: string
  name: string
  credentials: Record<string, unknown>
  sync_schedule?: string
  default_permission_tag?: string
}

export interface AdminUser {
  id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
  created_at: string
}

export interface CreateUserRequest {
  email: string
  password: string
  display_name: string
  role_name: string
}

export interface UpdateUserRequest {
  display_name?: string
  role_name?: string
  is_active?: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  permission_tags: string[]
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  details: Record<string, JsonValue>
  query_hash: string | null
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type LogoutHandler = () => void | Promise<void>

let onUnauthorized: LogoutHandler | null = null

export function registerApiUnauthorizedHandler(handler: LogoutHandler): void {
  onUnauthorized = handler
}

function normalizeApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
  const trimmed = raw.replace(/\/$/, "")
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseSourceJob(raw: Record<string, unknown>): SourceJob {
  return {
    id: String(raw["id"] ?? ""),
    source_id: String(raw["source_id"] ?? ""),
    status: String(raw["status"] ?? ""),
    documents_processed: Number(raw["documents_processed"] ?? 0),
    chunks_processed: Number(raw["chunks_processed"] ?? 0),
    error_message: raw["error_message"] == null ? null : String(raw["error_message"]),
    started_at: raw["started_at"] == null ? null : String(raw["started_at"]),
    completed_at: raw["completed_at"] == null ? null : String(raw["completed_at"]),
    created_at: String(raw["created_at"] ?? ""),
  }
}

function parseCitation(raw: Record<string, unknown>): Citation {
  const ts = raw["timestamp"]
  return {
    title: String(raw["title"] ?? ""),
    source_type: String(raw["source_type"] ?? ""),
    source_url: String(raw["source_url"] ?? ""),
    author: String(raw["author"] ?? ""),
    timestamp: ts instanceof Date ? ts.toISOString() : String(ts ?? ""),
    relevance_score: Number(raw["relevance_score"] ?? 0),
  }
}

function parseExpert(raw: Record<string, unknown>): Expert {
  const slack = raw["slack_member_id"]
  return {
    name: String(raw["name"] ?? ""),
    email: String(raw["email"] ?? ""),
    job_title: String(raw["job_title"] ?? ""),
    relevance_score: Number(raw["relevance_score"] ?? 0),
    ...(typeof slack === "string" && slack.length > 0 ? { slack_member_id: slack } : {}),
  }
}

export class ApiClient {
  private readonly baseUrl: string

  constructor() {
    this.baseUrl = normalizeApiBase()
  }

  private getToken(): string | null {
    return getAuthTokenFromBridge()
  }

  private async handleUnauthorized(): Promise<void> {
    clearSynapseTokenCookie()
    if (onUnauthorized) {
      await onUnauthorized()
    }
  }

  /** Authenticated GET (e.g. `/admin/stats`). */
  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" })
  }

  /** Authenticated POST with JSON body (omit `body` for empty POST). */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  }

  async deleteReq<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" })
  }

  private async request<T>(
    path: string,
    init: RequestInit & { skipAuth?: boolean } = {}
  ): Promise<T> {
    const { skipAuth, ...rest } = init
    const headers = new Headers(rest.headers)
    if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
      headers.set("Content-Type", "application/json")
    }
    const token = skipAuth ? null : this.getToken()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...rest, headers })

    if (res.status === 401) {
      await this.handleUnauthorized()
      const errBody = await safeJson(res)
      throw new ApiError("Unauthorized", 401, errBody)
    }

    if (!res.ok) {
      const errBody = await safeJson(res)
      const msg = formatApiError(errBody, `Request failed (${String(res.status)})`)
      throw new ApiError(msg, res.status, errBody)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return (await res.json()) as T
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", { method: "POST" })
  }

  async me(): Promise<User> {
    return this.request<User>("/auth/me", { method: "GET" })
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.request<void>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    })
  }

  async query(text: string): Promise<QueryResponse> {
    return this.request<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify({ query: text, stream: false } satisfies QueryRequestBody),
    })
  }

  async queryStream(text: string, callbacks: StreamCallbacks): Promise<void> {
    const token = this.getToken()
    if (!token) {
      callbacks.onError("Not authenticated")
      return
    }

    const url = `${this.baseUrl}/query/stream?q=${encodeURIComponent(text)}`
    let res: Response
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      })
    } catch {
      callbacks.onError("Network error")
      return
    }

    if (res.status === 401) {
      await this.handleUnauthorized()
      callbacks.onError("Unauthorized")
      return
    }

    if (!res.ok) {
      const errBody = await safeJson(res)
      callbacks.onError(formatApiError(errBody, `Stream failed (${String(res.status)})`))
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      callbacks.onError("No response body")
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const segments = buffer.split("\n\n")
        buffer = segments.pop() ?? ""

        for (const segment of segments) {
          for (const line of segment.split("\n")) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const payload = trimmed.slice(5).trim()
            let data: unknown
            try {
              data = JSON.parse(payload) as unknown
            } catch {
              callbacks.onError("Invalid SSE payload")
              return
            }
            if (!isRecord(data) || typeof data["type"] !== "string") continue

            const t = data["type"]
            if (t === "retrieval_done") {
              const n = data["chunk_count"]
              callbacks.onRetrieval(typeof n === "number" ? n : Number(n))
            } else if (t === "token") {
              const tok = data["token"]
              if (typeof tok === "string") callbacks.onToken(tok)
            } else if (t === "error") {
              const m = data["message"]
              callbacks.onError(typeof m === "string" ? m : "Stream error")
              return
            } else if (t === "complete") {
              const rawCitations = data["citations"]
              const citations: Citation[] = Array.isArray(rawCitations)
                ? rawCitations
                    .filter(isRecord)
                    .map((c) => parseCitation(c))
                : []

              let expert: Expert | null = null
              const ex = data["expert"]
              if (isRecord(ex)) {
                expert = parseExpert(ex)
              }

              const conf = data["confidence"]
              const confidence = typeof conf === "number" ? conf : Number(conf)

              callbacks.onComplete({ citations, expert, confidence })
              return
            }
          }
        }
      }
    } catch {
      callbacks.onError("Stream interrupted")
    }
  }

  async listSources(): Promise<Source[]> {
    return this.request<Source[]>("/admin/sources", { method: "GET" })
  }

  async createSource(data: CreateSourceRequest): Promise<Source> {
    return this.request<Source>("/admin/sources", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async deleteSource(id: string): Promise<void> {
    await this.request<void>(`/admin/sources/${encodeURIComponent(id)}`, { method: "DELETE" })
  }

  async syncSource(id: string): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>(`/admin/sources/${encodeURIComponent(id)}/sync`, {
      method: "POST",
    })
  }

  async listSourceJobs(id: string): Promise<SourceJob[]> {
    const raw = await this.request<unknown[]>(`/admin/sources/${encodeURIComponent(id)}/jobs`, {
      method: "GET",
    })
    return Array.isArray(raw) ? raw.filter(isRecord).map(parseSourceJob) : []
  }

  async listUsers(params?: {
    page?: number
    size?: number
    q?: string
    role?: string
  }): Promise<PaginatedResponse<AdminUser>> {
    const sp = new URLSearchParams()
    if (params?.page != null) sp.set("page", String(params.page))
    if (params?.size != null) sp.set("size", String(params.size))
    if (params?.q) sp.set("q", params.q)
    if (params?.role) sp.set("role", params.role)
    const qs = sp.toString()
    return this.request<PaginatedResponse<AdminUser>>(
      `/admin/users${qs ? `?${qs}` : ""}`,
      { method: "GET" }
    )
  }

  async createUser(data: CreateUserRequest): Promise<AdminUser> {
    return this.request<AdminUser>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<AdminUser> {
    const body: Record<string, unknown> = {}
    if (data.display_name !== undefined) body.display_name = data.display_name
    if (data.role_name !== undefined) body.role_name = data.role_name
    if (data.is_active !== undefined) body.is_active = data.is_active
    return this.request<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  }

  async deleteUser(id: string): Promise<void> {
    await this.request<void>(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" })
  }

  async listRoles(): Promise<Role[]> {
    return this.request<Role[]>("/admin/roles", { method: "GET" })
  }

  async listConversations(): Promise<ConversationSummary[]> {
    return this.request<ConversationSummary[]>("/conversations", { method: "GET" })
  }

  async createConversation(title?: string): Promise<ConversationDetail> {
    return this.request<ConversationDetail>("/conversations", {
      method: "POST",
      body: JSON.stringify({ title: title ?? "New conversation" }),
    })
  }

  async getConversation(id: string): Promise<ConversationDetail> {
    return this.request<ConversationDetail>(`/conversations/${encodeURIComponent(id)}`, {
      method: "GET",
    })
  }

  async updateConversationTitle(id: string, title: string): Promise<ConversationSummary> {
    return this.request<ConversationSummary>(`/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    })
  }

  async appendConversationMessage(
    conversationId: string,
    payload: {
      role: "user" | "assistant"
      content: string
      extra?: Record<string, JsonValue> | null
    }
  ): Promise<ConversationMessage> {
    return this.request<ConversationMessage>(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async listAuditLogs(params?: {
    user_id?: string
    action?: string
    from_dt?: string
    to_dt?: string
    page?: number
  }): Promise<PaginatedResponse<AuditLog>> {
    const sp = new URLSearchParams()
    if (params?.user_id) sp.set("user_id", params.user_id)
    if (params?.action) sp.set("action", params.action)
    if (params?.from_dt) sp.set("from_dt", params.from_dt)
    if (params?.to_dt) sp.set("to_dt", params.to_dt)
    if (params?.page != null) sp.set("page", String(params.page))
    const qs = sp.toString()
    return this.request<PaginatedResponse<AuditLog>>(`/admin/audit${qs ? `?${qs}` : ""}`, {
      method: "GET",
    })
  }
}

export function formatApiError(errBody: unknown, fallback: string): string {
  if (typeof errBody === "string" && errBody.trim()) {
    return errBody
  }
  if (!isRecord(errBody)) {
    return fallback
  }
  const detail = errBody["detail"]
  if (typeof detail === "string" && detail.trim()) {
    return detail
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (!isRecord(item)) return null
        const msg = item["msg"]
        const loc = item["loc"]
        if (typeof msg === "string" && Array.isArray(loc)) {
          return `${loc.filter((x) => x !== "body").join(".")}: ${msg}`
        }
        return typeof msg === "string" ? msg : null
      })
      .filter((x): x is string => Boolean(x))
    if (parts.length > 0) {
      return parts.join("; ")
    }
  }
  return fallback
}

export interface ConversationSummary {
  id: string
  title: string
  updated_at: string
  message_count: number
}

export interface ConversationMessage {
  id: string
  role: "user" | "assistant"
  content: string
  extra: Record<string, JsonValue> | null
  created_at: string
}

export interface ConversationDetail {
  id: string
  title: string
  updated_at: string
  messages: ConversationMessage[]
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

const defaultClient = new ApiClient()

export function getApiClient(): ApiClient {
  return defaultClient
}
