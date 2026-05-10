"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { useAuthStore } from "@/store/auth-store"
import { getApiClient } from "@/lib/api-client"
import type { AdminUser, Role } from "@/lib/api-client"
import { ApiError } from "@/lib/api-client"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Dialog } from "@/components/ui/Dialog"
import { Avatar } from "@/components/ui/Avatar"
import { Pencil, Trash2, UserPlus, X } from "lucide-react"
export default function AdminUsersPage() {
  const router = useRouter()
  const { user, isHydrated } = useAuthStore()
  const [rows, setRows] = React.useState<AdminUser[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [q, setQ] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("")
  const [roles, setRoles] = React.useState<Role[]>([])
  const [addOpen, setAddOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<AdminUser | null>(null)
  const [deleteUser, setDeleteUser] = React.useState<AdminUser | null>(null)

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await getApiClient().listUsers({
        page: 1,
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
      })
      setRows(res.items)
      setTotal(res.total)
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Failed to load users")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [q, roleFilter])

  React.useEffect(() => {
    if (!isHydrated) return
    if (user?.role !== "ADMIN") {
      toast.error("Admin access required")
      router.replace("/chat")
      return
    }
    void (async () => {
      try {
        const r = await getApiClient().listRoles()
        setRoles(r)
      } catch {
        setRoles([])
      }
    })()
  }, [isHydrated, user?.role, router])

  React.useEffect(() => {
    if (!isHydrated || user?.role !== "ADMIN") return
    const t = window.setTimeout(() => void fetchUsers(), 300)
    return () => window.clearTimeout(t)
  }, [isHydrated, user?.role, fetchUsers])

  if (!isHydrated || user?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {total} user{total === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email or name" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-secondary">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full min-w-[160px] border-b border-border-strong bg-transparent py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none sm:w-48"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-[12px] border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-status-error">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-border-medium">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={u.display_name
                          .split(/\s+/)
                          .map((p) => p.charAt(0))
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                        className="h-8 w-8"
                      />
                      <div>
                        <p className="font-medium text-text-primary">{u.display_name}</p>
                        <p className="text-xs text-text-tertiary">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "success" : "warning"}>
                      {u.is_active ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteUser(u)}>
                        <Trash2 className="h-4 w-4 text-status-error" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddUserModal
        isOpen={addOpen}
        roles={roles}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false)
          void fetchUsers()
        }}
      />

      <EditUserDrawer
        user={editUser}
        roles={roles}
        onClose={() => setEditUser(null)}
        onSaved={() => {
          setEditUser(null)
          void fetchUsers()
        }}
      />

      <DeleteUserDialog
        target={deleteUser}
        currentUserId={user.id}
        onClose={() => setDeleteUser(null)}
        onDeleted={() => {
          setDeleteUser(null)
          void fetchUsers()
        }}
      />
    </div>
  )
}

function AddUserModal({
  isOpen,
  onClose,
  roles,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  roles: Role[]
  onCreated: () => void
}) {
  const [email, setEmail] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [roleName, setRoleName] = React.useState(roles[0]?.name ?? "USER")
  const [err, setErr] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (roles[0]?.name) setRoleName(roles[0].name)
  }, [roles])

  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      await getApiClient().createUser({
        email: email.trim(),
        display_name: displayName.trim(),
        password,
        role_name: roleName,
      })
      toast.success("User created")
      onCreated()
      setEmail("")
      setDisplayName("")
      setPassword("")
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add user">
      {err ? <p className="mb-2 text-sm text-status-error">{err}</p> : null}
      <div className="space-y-3">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-secondary">Role</label>
          <select
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="w-full border-b border-border-strong bg-transparent py-2 text-sm focus:border-accent-primary focus:outline-none"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" isLoading={busy} onClick={() => void submit()}>
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function EditUserDrawer({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: AdminUser | null
  roles: Role[]
  onClose: () => void
  onSaved: () => void
}) {
  const [displayName, setDisplayName] = React.useState("")
  const [roleName, setRoleName] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.display_name)
      setRoleName(user.role)
      setIsActive(user.is_active)
    }
  }, [user])

  if (!user) return null

  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      await getApiClient().updateUser(user.id, {
        display_name: displayName.trim(),
        role_name: roleName,
        is_active: isActive,
      })
      toast.success("User updated")
      onSaved()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Update failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg-primary/60 backdrop-blur-sm" role="presentation">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border-medium bg-bg-secondary">
        <div className="flex items-center justify-between border-b border-border-subtle p-4">
          <h2 className="font-bold text-text-primary">Edit user</h2>
          <button type="button" className="rounded p-2 hover:bg-surface-2" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {roleName !== user.role ? (
            <div className="rounded-[8px] border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
              This will log {user.display_name} out of all devices.
            </div>
          ) : null}
          {err ? <p className="text-sm text-status-error">{err}</p> : null}
          <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-secondary">Role</label>
            <select
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full border-b border-border-strong bg-transparent py-2 text-sm focus:border-accent-primary focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong text-accent-primary focus:ring-accent-primary"
            />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border-subtle p-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" isLoading={busy} onClick={() => void submit()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeleteUserDialog({
  target,
  currentUserId,
  onClose,
  onDeleted,
}: {
  target: AdminUser | null
  currentUserId: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = React.useState(false)

  if (!target) return null

  const isSelf = target.id === currentUserId

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await getApiClient().deleteUser(target.id)
      toast.success("User deleted")
      onDeleted()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Delete failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title="Delete user"
      description={`Delete ${target.email}? This cannot be undone.`}
    >
      {isSelf ? (
        <p className="text-sm text-status-warning">You cannot delete your own account.</p>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" type="button" isLoading={busy} onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </div>
      )}
    </Dialog>
  )
}
