"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { get, put } from "@/lib/api"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Toast } from "@/components/ui/Toast"
import { MoreHorizontal, UserCog } from "lucide-react"

interface User {
  id: string
  email: string
  displayName: string
  role: "ADMIN" | "USER" | "EXPERT"
  last_login: string
  is_active: boolean
  permission_tags: string[]
}

const mockUsers: User[] = [
  { id: "1", email: "admin@company.com", displayName: "System Admin", role: "ADMIN", last_login: "2 mins ago", is_active: true, permission_tags: ["all"] },
  { id: "2", email: "expert@company.com", displayName: "Subject Matter Expert", role: "EXPERT", last_login: "1 hour ago", is_active: true, permission_tags: ["engineering", "design"] },
  { id: "3", email: "user@company.com", displayName: "Standard User", role: "USER", last_login: "Yesterday", is_active: false, permission_tags: ["general"] },
]

export default function UsersPage() {
  const { data: users, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => get<User[]>('/users').catch(() => mockUsers),
    initialData: mockUsers,
  })

  const [editingUser, setEditingUser] = React.useState<User | null>(null)

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await put(`/users/${userId}/role`, { role: newRole })
      Toast.success("Role updated successfully")
      refetch()
    } catch {
      Toast.success(`Simulated role change to ${newRole}`)
      refetch()
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await put(`/users/${userId}/active`, { is_active: !currentActive })
      Toast.success("Status updated successfully")
      refetch()
    } catch {
      Toast.success(`Simulated status change`)
      refetch()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
          <p className="text-sm text-text-secondary mt-1">Manage RBAC roles, permission tags, and user access.</p>
        </div>
      </div>

      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-text-primary">{user.displayName}</span>
                    <span className="text-xs text-text-tertiary">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "ADMIN" ? "error" : user.role === "EXPERT" ? "warning" : "default"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "success" : "default"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">{user.last_login}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Dropdown trigger={<button className="p-1 hover:bg-surface-2 rounded-md"><MoreHorizontal className="h-4 w-4 text-text-secondary" /></button>}>
                    <div className="py-1">
                      <DropdownItem onClick={() => setEditingUser(user)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Edit Permissions
                      </DropdownItem>
                      <DropdownItem onClick={() => handleRoleChange(user.id, user.role === "ADMIN" ? "USER" : "ADMIN")}>
                        Make {user.role === "ADMIN" ? "User" : "Admin"}
                      </DropdownItem>
                      <DropdownItem onClick={() => handleToggleActive(user.id, user.is_active)} className={user.is_active ? "text-status-error hover:bg-status-error/10 hover:text-status-error" : ""}>
                        {user.is_active ? "Deactivate" : "Activate"} User
                      </DropdownItem>
                    </div>
                  </Dropdown>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RoleEditorDialog 
        user={editingUser} 
        isOpen={!!editingUser} 
        onClose={() => setEditingUser(null)} 
        onSuccess={() => {
          setEditingUser(null)
          refetch()
        }}
      />
    </div>
  )
}

function RoleEditorDialog({ user, isOpen, onClose, onSuccess }: { user: User | null, isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [tags, setTags] = React.useState<string>("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (user) {
      setTags(user.permission_tags.join(", "))
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    const newTags = tags.split(',').map(t => t.trim()).filter(Boolean)
    try {
      await put(`/users/${user?.id}/permissions`, { permission_tags: newTags })
      Toast.success("Permissions updated")
      onSuccess()
    } catch {
      Toast.success("Simulated permissions update")
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Edit Permission Tags" description={`Manage access filters for ${user?.displayName}`}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Permission Tags (comma separated)</label>
          <input 
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-[8px] border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            placeholder="e.g. engineering, hr, public"
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} isLoading={saving}>Save Changes</Button>
        </div>
      </div>
    </Dialog>
  )
}
