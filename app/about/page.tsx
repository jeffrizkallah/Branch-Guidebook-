import Link from 'next/link'
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Target, Users, ArrowRight } from 'lucide-react'

export default function AboutPage() {
  const lastUpdated = 'November 12, 2025'

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0">
        <div className="flex-1 container mx-auto px-4 py-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">About Branch Guidebook</h1>
              <p className="text-xl text-muted-foreground">
                Your comprehensive operational guide for excellence across all Mikana branches
              </p>
            </div>

            {/* Purpose Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Standardization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ensure consistent operational standards across all branches with clear,
                  accessible documentation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Achieve operational excellence through detailed checklists, timelines, and
                  best practices.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Training</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Streamline onboarding and training with role-specific guides and visual
                  references.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>What is Branch Guidebook?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The Branch Guidebook is a digital operational manual designed specifically for
                Mikana's school canteen operations. It provides comprehensive, role-based guidance
                to ensure every team member knows exactly what to do, when to do it, and how to do
                it right.
              </p>
              <p>
                This guidebook covers all 12 Mikana branches across the UAE, providing tailored
                information for each location including delivery schedules, contact information,
                KPIs, and operational procedures.
              </p>
              <p>
                Each role—from Manager to Cleaner—has detailed daily timelines, checklists, and
                best practices to follow. Interactive checklists track completion throughout the
                day, helping ensure nothing is missed.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Interactive Checklists</div>
                    <div className="text-sm text-muted-foreground">
                      Track daily tasks with persistent state that resets each day
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Role-Specific Guides</div>
                    <div className="text-sm text-muted-foreground">
                      Detailed responsibilities and timelines for every position
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Print-Friendly</div>
                    <div className="text-sm text-muted-foreground">
                      Generate clean printed guides for offline reference
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Mobile Responsive</div>
                    <div className="text-sm text-muted-foreground">
                      Access guides on any device, anywhere in the branch
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Search & Filter</div>
                    <div className="text-sm text-muted-foreground">
                      Quickly find the branch or information you need
                    </div>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Branch Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Currently supporting operations at 12 branches across the UAE:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>• ISC Soufouh</div>
                <div>• ISC DIP</div>
                <div>• ISC Sharjah</div>
                <div>• ISC RAK</div>
                <div>• ISC Aljada</div>
                <div>• ISC Ajman</div>
                <div>• ISC UEQ</div>
                <div>• CK (Knowledge Park)</div>
                <div>• Sabis YAS</div>
                <div>• ISC Khalifa</div>
                <div>• ISC Ain</div>
                <div>• Bateen</div>
              </div>
            </CardContent>
          </Card>

          {/* Last Updated */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Last updated: <span className="font-semibold">{lastUpdated}</span>
                </div>
                <Link href="/">
                  <Button>View Branches</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  )
}

