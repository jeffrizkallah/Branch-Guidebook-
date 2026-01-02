'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserPlus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Building2,
  RefreshCw,
  Search,
  MoreHorizontal,
  Key,
  Trash2,
  Edit,
  Mail,
  Phone,
  Globe,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { roleDisplayNames, type UserRole, type UserWithBranches } from '@/lib/auth'

// Branch list (will be fetched from API in production)
const branchOptions = [
  { slug: 'central-kitchen', name: 'Central Kitchen' },
  { slug: 'isc-soufouh', name: 'ISC Soufouh' },
  { slug: 'isc-dip', name: 'ISC DIP' },
  { slug: 'isc-sharja', name: 'ISC Sharjah' },
  { slug: 'isc-rak', name: 'ISC RAK' },
  { slug: 'isc-aljada', name: 'ISC Aljada' },
  { slug: 'isc-ajman', name: 'ISC Ajman' },
  { slug: 'isc-ueq', name: 'ISC UEQ' },
  { slug: 'sabis-yas', name: 'Sabis YAS' },
  { slug: 'isc-khalifa', name: 'ISC Khalifa' },
  { slug: 'isc-ain', name: 'ISC Ain' },
  { slug: 'bateen', name: 'Bateen' },
  { slug: 'sis-ruwais', name: 'SIS Ruwais' },
]

const roleOptions: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'operations_lead', label: 'Operations Lead', description: 'Recipe & production management' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Dispatch management' },
  { value: 'central_kitchen', label: 'Central Kitchen', description: 'CK operations' },
  { value: 'branch_manager', label: 'Branch Manager', description: 'Multi-branch dashboard access' },
  { value: 'branch_staff', label: 'Branch Staff', description: 'Access to assigned branches' },
]

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
}

function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  const { isAdmin, loading: authLoading } = useAuth({ required: true, allowedRoles: ['admin'] })
  
  const [users, setUsers] = useState<UserWithBranches[]>([])
  const [pendingUsers, setPendingUsers] = useState<UserWithBranches[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithBranches | null>(null)
  
  // Form states
  const [formRole, setFormRole] = useState<UserRole | ''>('')
  const [formBranches, setFormBranches] = useState<string[]>([])
  const [formStatus, setFormStatus] = useState<string>('active')
  const [newPassword, setNewPassword] = useState('')
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    nationality: '',
    phone: '',
    role: '' as UserRole | '',
    branches: [] as string[]
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const [allUsersRes, pendingRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/users?pending=true')
      ])
      
      const allUsersData = await allUsersRes.json()
      const pendingData = await pendingRes.json()
      
      setUsers(allUsersData.users || [])
      setPendingUsers(pendingData.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedUser || !formRole) return
    
    setFormLoading(true)
    setFormError('')
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          role: formRole,
          branches: (formRole === 'branch_manager' || formRole === 'branch_staff') ? formBranches : undefined
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve user')
      }
      
      setApproveModalOpen(false)
      setSelectedUser(null)
      setFormRole('')
      setFormBranches([])
      fetchUsers()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleReject = async (userId: number) => {
    if (!confirm('Are you sure you want to reject this user?')) return
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: 'Application rejected by admin' })
      })
      
      if (!response.ok) throw new Error('Failed to reject user')
      
      fetchUsers()
    } catch (error) {
      console.error('Error rejecting user:', error)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    
    setFormLoading(true)
    setFormError('')
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          role: formRole || undefined,
          status: formStatus,
          branches: (formRole === 'branch_manager' || formRole === 'branch_staff') ? formBranches : undefined
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user')
      }
      
      setEditModalOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return
    
    setFormLoading(true)
    setFormError('')
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', newPassword })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset password')
      }
      
      setResetPasswordModalOpen(false)
      setSelectedUser(null)
      setNewPassword('')
      alert('Password reset successfully')
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddUser = async () => {
    setFormLoading(true)
    setFormError('')
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user')
      }
      
      setAddModalOpen(false)
      setNewUserData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        nationality: '',
        phone: '',
        role: '',
        branches: []
      })
      fetchUsers()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeactivate = async (userId: number) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to deactivate user')
      fetchUsers()
    } catch (error) {
      console.error('Error deactivating user:', error)
    }
  }

  const openApproveModal = (user: UserWithBranches) => {
    setSelectedUser(user)
    setFormRole('')
    setFormBranches([])
    setFormError('')
    setApproveModalOpen(true)
  }

  const openEditModal = (user: UserWithBranches) => {
    setSelectedUser(user)
    setFormRole(user.role || '')
    setFormBranches(user.branches || [])
    setFormStatus(user.status)
    setFormError('')
    setEditModalOpen(true)
  }

  const openResetPasswordModal = (user: UserWithBranches) => {
    setSelectedUser(user)
    setNewPassword('')
    setFormError('')
    setResetPasswordModalOpen(true)
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return user.status !== 'pending'
    const query = searchQuery.toLowerCase()
    return (
      user.status !== 'pending' &&
      (user.email.toLowerCase().includes(query) ||
       user.firstName.toLowerCase().includes(query) ||
       user.lastName.toLowerCase().includes(query))
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-700 border-0"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-0"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string | null) => {
    if (!role) return <Badge variant="outline">No Role</Badge>
    
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      operations_lead: 'bg-blue-100 text-blue-700',
      dispatcher: 'bg-orange-100 text-orange-700',
      central_kitchen: 'bg-rose-100 text-rose-700',
      branch_manager: 'bg-green-100 text-green-700',
      branch_staff: 'bg-teal-100 text-teal-700',
    }
    
    return (
      <Badge className={`${colors[role] || ''} border-0`}>
        {roleDisplayNames[role as UserRole] || role}
      </Badge>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage user accounts and permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Approvals ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />{user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />{user.phone}
                        </span>
                      )}
                      {user.nationality && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />{user.nationality}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Signed up: {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => openApproveModal(user)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(user.id)}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Users */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              All Users ({filteredUsers.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  {(user.role === 'branch_manager' || user.role === 'branch_staff') && user.branches && user.branches.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {user.branches.map(slug => 
                          branchOptions.find(b => b.slug === slug)?.name || slug
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditModal(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openResetPasswordModal(user)}>
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeactivate(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title={`Approve: ${selectedUser?.firstName} ${selectedUser?.lastName}`}
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Email:</strong> {selectedUser?.email}</p>
            {selectedUser?.phone && <p><strong>Phone:</strong> {selectedUser.phone}</p>}
            {selectedUser?.nationality && <p><strong>Nationality:</strong> {selectedUser.nationality}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Assign Role *</Label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Select a role</option>
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>
          
          {formRole === 'branch_manager' && (
            <div className="space-y-2">
              <Label>Assign Branches</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {branchOptions.map(branch => (
                  <label key={branch.slug} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formBranches.includes(branch.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormBranches([...formBranches, branch.slug])
                        } else {
                          setFormBranches(formBranches.filter(b => b !== branch.slug))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {formRole === 'branch_staff' && (
            <div className="space-y-2">
              <Label>Assign Branches</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select one or more branches. The first selected branch will be the main/home branch.
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {branchOptions.map(branch => {
                  const isChecked = formBranches.includes(branch.slug)
                  const isMain = formBranches[0] === branch.slug
                  return (
                    <label key={branch.slug} className={`flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer ${isMain ? 'bg-primary/10 border border-primary/30' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormBranches([...formBranches, branch.slug])
                          } else {
                            setFormBranches(formBranches.filter(b => b !== branch.slug))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{branch.name}</span>
                      {isMain && <Badge className="bg-primary/20 text-primary text-xs">Main</Badge>}
                      {isChecked && !isMain && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.preventDefault()
                            // Move this branch to the front (make it main)
                            const newBranches = [branch.slug, ...formBranches.filter(b => b !== branch.slug)]
                            setFormBranches(newBranches)
                          }}
                        >
                          Set as Main
                        </Button>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          
          {formError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleApprove} disabled={!formRole || formLoading}>
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit: ${selectedUser?.firstName} ${selectedUser?.lastName}`}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          {formRole === 'branch_manager' && (
            <div className="space-y-2">
              <Label>Assigned Branches</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {branchOptions.map(branch => (
                  <label key={branch.slug} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formBranches.includes(branch.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormBranches([...formBranches, branch.slug])
                        } else {
                          setFormBranches(formBranches.filter(b => b !== branch.slug))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {formRole === 'branch_staff' && (
            <div className="space-y-2">
              <Label>Assigned Branches</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select one or more branches. The first selected branch will be the main/home branch.
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {branchOptions.map(branch => {
                  const isChecked = formBranches.includes(branch.slug)
                  const isMain = formBranches[0] === branch.slug
                  return (
                    <label key={branch.slug} className={`flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer ${isMain ? 'bg-primary/10 border border-primary/30' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormBranches([...formBranches, branch.slug])
                          } else {
                            setFormBranches(formBranches.filter(b => b !== branch.slug))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{branch.name}</span>
                      {isMain && <Badge className="bg-primary/20 text-primary text-xs">Main</Badge>}
                      {isChecked && !isMain && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.preventDefault()
                            // Move this branch to the front (make it main)
                            const newBranches = [branch.slug, ...formBranches.filter(b => b !== branch.slug)]
                            setFormBranches(newBranches)
                          }}
                        >
                          Set as Main
                        </Button>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          
          {formError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleUpdateUser} disabled={formLoading}>
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        title={`Reset Password: ${selectedUser?.firstName} ${selectedUser?.lastName}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a new password for this user. They will need to use this password on their next login.
          </p>
          
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          
          {formError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setResetPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleResetPassword} disabled={!newPassword || formLoading}>
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New User"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input
                value={newUserData.firstName}
                onChange={(e) => setNewUserData({...newUserData, firstName: e.target.value})}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                value={newUserData.lastName}
                onChange={(e) => setNewUserData({...newUserData, lastName: e.target.value})}
                placeholder="Last name"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={newUserData.email}
              onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
              placeholder="email@mikana.ae"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Password *</Label>
            <Input
              type="password"
              value={newUserData.password}
              onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
              placeholder="Password"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Role *</Label>
            <select
              value={newUserData.role}
              onChange={(e) => setNewUserData({...newUserData, role: e.target.value as UserRole})}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Select a role</option>
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          {newUserData.role === 'branch_manager' && (
            <div className="space-y-2">
              <Label>Assign Branches</Label>
              <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1">
                {branchOptions.map(branch => (
                  <label key={branch.slug} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserData.branches.includes(branch.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewUserData({...newUserData, branches: [...newUserData.branches, branch.slug]})
                        } else {
                          setNewUserData({...newUserData, branches: newUserData.branches.filter(b => b !== branch.slug)})
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {newUserData.role === 'branch_staff' && (
            <div className="space-y-2">
              <Label>Assign Branches</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select one or more branches. The first selected branch will be the main/home branch.
              </p>
              <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1">
                {branchOptions.map(branch => {
                  const isChecked = newUserData.branches.includes(branch.slug)
                  const isMain = newUserData.branches[0] === branch.slug
                  return (
                    <label key={branch.slug} className={`flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer ${isMain ? 'bg-primary/10 border border-primary/30' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUserData({...newUserData, branches: [...newUserData.branches, branch.slug]})
                          } else {
                            setNewUserData({...newUserData, branches: newUserData.branches.filter(b => b !== branch.slug)})
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{branch.name}</span>
                      {isMain && <Badge className="bg-primary/20 text-primary text-xs">Main</Badge>}
                      {isChecked && !isMain && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.preventDefault()
                            // Move this branch to the front (make it main)
                            const newBranches = [branch.slug, ...newUserData.branches.filter(b => b !== branch.slug)]
                            setNewUserData({...newUserData, branches: newBranches})
                          }}
                        >
                          Set as Main
                        </Button>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          
          {formError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleAddUser} 
              disabled={!newUserData.email || !newUserData.password || !newUserData.firstName || !newUserData.lastName || !newUserData.role || formLoading}
            >
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

