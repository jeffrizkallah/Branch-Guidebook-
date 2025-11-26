'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChefHat, 
  Building2, 
  Users, 
  Truck, 
  Settings, 
  ArrowRight,
  Lock,
  Bell
} from 'lucide-react'

interface FeatureCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  available: boolean
}

export default function AdminDashboardPage() {
  const features: FeatureCard[] = [
    {
      id: 'recipes',
      title: 'Recipe Manager',
      description: 'Manage recipes, ingredients, preparation steps, and SOPs',
      icon: <ChefHat className="h-5 w-5" />,
      href: '/admin/recipes',
      available: true,
    },
    {
      id: 'branches',
      title: 'Branch Management',
      description: 'Edit branch information, contacts, and operating hours',
      icon: <Building2 className="h-5 w-5" />,
      href: '/admin/branches',
      available: true,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Create announcements, patch notes, and alerts for employees',
      icon: <Bell className="h-5 w-5" />,
      href: '/admin/notifications',
      available: true,
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage staff accounts and permissions',
      icon: <Users className="h-5 w-5" />,
      href: '/admin/users',
      available: false,
    },
    {
      id: 'dispatch',
      title: 'Dispatch Control',
      description: 'Manage dispatch settings and archive',
      icon: <Truck className="h-5 w-5" />,
      href: '/admin/dispatch',
      available: false,
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure system preferences and security',
      icon: <Settings className="h-5 w-5" />,
      href: '/admin/settings',
      available: false,
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Lock className="h-3.5 w-3.5" />
          <span>Admin Dashboard</span>
        </div>
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-base text-muted-foreground">
          Manage your Mikana Branch Guidebook system
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {features.map((feature) => (
          <Card
            key={feature.id}
            className={`
              transition-all duration-200
              ${feature.available 
                ? 'hover:shadow-lg hover:border-primary/50 cursor-pointer' 
                : 'opacity-60'
              }
            `}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg flex-shrink-0
                    ${feature.available ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                  `}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg leading-tight">{feature.title}</CardTitle>
                </div>
                {!feature.available && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 flex-shrink-0">
                    Soon
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]">
                {feature.description}
              </p>
              <div className="pt-2">
                {feature.available ? (
                  <Link href={feature.href}>
                    <Button className="w-full gap-2" size="sm">
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full gap-2" size="sm" disabled>
                    <Lock className="h-3.5 w-3.5" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-dashed mt-6">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">More Features Coming Soon</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Additional admin features are under development. Contact your system administrator 
                if you need specific functionality.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

