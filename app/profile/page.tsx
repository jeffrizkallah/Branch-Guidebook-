'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Shield, 
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  GraduationCap,
  RotateCcw,
} from 'lucide-react'
import { useOnboarding } from '@/lib/onboarding/context'
import { roleDisplayNames, type UserRole } from '@/lib/auth'

// Helper function for role badge colors
const getRoleBadgeColor = (role: string) => {
  const colors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    operations_lead: 'bg-blue-100 text-blue-700',
    dispatcher: 'bg-orange-100 text-orange-700',
    central_kitchen: 'bg-rose-100 text-rose-700',
    branch_manager: 'bg-green-100 text-green-700',
    branch_staff: 'bg-teal-100 text-teal-700',
  }
  return colors[role] || 'bg-gray-100 text-gray-700'
}

// ProfileContent extracted as a separate component to prevent re-creation on parent re-renders
// This fixes mobile keyboard disappearing issue when typing in password fields
interface ProfileContentProps {
  user: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string | null
    branches?: string[]
  } | undefined
  role: UserRole | null
  isChangingPassword: boolean
  setIsChangingPassword: (value: boolean) => void
  passwordData: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }
  setPasswordData: React.Dispatch<React.SetStateAction<{
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }>>
  passwordError: string
  setPasswordError: (value: string) => void
  passwordSuccess: string
  isSubmitting: boolean
  handlePasswordChange: (e: React.FormEvent) => Promise<void>
}

function ProfileContent({
  user,
  role,
  isChangingPassword,
  setIsChangingPassword,
  passwordData,
  setPasswordData,
  passwordError,
  setPasswordError,
  passwordSuccess,
  isSubmitting,
  handlePasswordChange,
}: ProfileContentProps) {
  const { resetOnboarding, onboardingState } = useOnboarding()
  const [isResettingTour, setIsResettingTour] = useState(false)

  const handleReplayTour = async () => {
    setIsResettingTour(true)
    try {
      await resetOnboarding()
    } finally {
      setIsResettingTour(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      {/* Account Info */}
      <Card data-tour-id="profile-info">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Full Name</Label>
              <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            </div>
            
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Role</Label>
              <div>
                <Badge className={`${getRoleBadgeColor(role || '')} border-0`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {role ? roleDisplayNames[role] : 'Unknown'}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <p className="font-medium">{user?.email}</p>
            </div>

            {role === 'branch_manager' && user?.branches && user.branches.length > 0 && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Assigned Branches
                </Label>
                <div className="flex flex-wrap gap-1">
                  {user.branches.map(branch => (
                    <Badge key={branch} variant="outline" className="text-xs">
                      {branch.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {role === 'branch_staff' && user?.branches && user.branches.length > 0 && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Assigned Branch
                </Label>
                <Badge variant="outline">
                  {user.branches[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card data-tour-id="security-section">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>
            Change your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isChangingPassword ? (
            <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  inputMode="text"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  inputMode="text"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  inputMode="text"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  {passwordSuccess}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Password'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setPasswordError('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Replay Tour Guide */}
      <Card data-tour-id="replay-tour" className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Tour Guide
          </CardTitle>
          <CardDescription>
            Need a refresher on how to use the app?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {onboardingState?.toursCompleted && onboardingState.toursCompleted.length > 0 ? (
                <p>You&apos;ve completed {onboardingState.toursCompleted.length} tour{onboardingState.toursCompleted.length !== 1 ? 's' : ''}. Replay to see tips again.</p>
              ) : (
                <p>Get a guided walkthrough of the app&apos;s features.</p>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={handleReplayTour}
              disabled={isResettingTour}
              className="shrink-0"
            >
              {isResettingTour ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Replay Tour
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const user = session?.user
  const role = user?.role as UserRole | null

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setPasswordError(data.error || 'Failed to change password')
        return
      }

      setPasswordSuccess('Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
    } catch (error) {
      setPasswordError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const profileContentProps = {
    user,
    role,
    isChangingPassword,
    setIsChangingPassword,
    passwordData,
    setPasswordData,
    passwordError,
    setPasswordError,
    passwordSuccess,
    isSubmitting,
    handlePasswordChange,
  }

  // Branch staff gets minimal layout
  if (role === 'branch_staff') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <RoleSidebar />
        <main className="pt-20 pb-8 px-4">
          <div className="max-w-2xl mx-auto">
            <ProfileContent {...profileContentProps} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <RoleSidebar />
      <main className="flex-1 pt-14 xs:pt-16 lg:pt-0">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <ProfileContent {...profileContentProps} />
        </div>
      </main>
    </div>
  )
}

