import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Mail } from 'lucide-react'
import { RoleSidebar } from '@/components/RoleSidebar'
import { Footer } from '@/components/Footer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PrintHeader } from '@/components/PrintHeader'
import { Checklist } from '@/components/Checklist'
import { DailyTimeline } from '@/components/DailyTimeline'
import { MediaGallery } from '@/components/MediaGallery'
import { loadBranch, getRole } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface RolePageProps {
  params: Promise<{
    slug: string
    role: string
  }>
  searchParams: Promise<{
    print?: string
  }>
}

export default async function RolePage({ params, searchParams }: RolePageProps) {
  const { slug, role: roleId } = await params
  const { print } = await searchParams
  const branch = await loadBranch(slug)
  const role = getRole(roleId)

  if (!branch || !role) {
    notFound()
  }

  const isPrintMode = print === '1'

  // "What good looks like" sample images
  const whatGoodLooksLike = [
    `https://picsum.photos/seed/${roleId}-good-1/800/600`,
    `https://picsum.photos/seed/${roleId}-good-2/800/600`,
  ]

  return (
    <div className={isPrintMode ? "min-h-screen flex flex-col" : "flex min-h-screen"}>
      {!isPrintMode && <RoleSidebar />}
      <PrintHeader branchName={branch.name} pageTitle={role.name} />

      <main className={isPrintMode ? "flex-1 container mx-auto px-4 py-8" : "flex-1 flex flex-col pt-14 xs:pt-16 lg:pt-0"}>
        <div className="flex-1 container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: branch.name, href: `/branch/${branch.slug}` },
              { label: role.name },
            ]}
          />

          {/* Header */}
          <div className="mb-8">
            <div className="mb-4">
              <h1 className="text-4xl font-bold mb-2">{role.name}</h1>
              <p className="text-lg text-muted-foreground">{branch.name}</p>
            </div>

            {!isPrintMode && (
              <div className="flex justify-end gap-2 mb-4">
                <Link href={`/branch/${branch.slug}/role/${roleId}?print=1`} target="_blank">
                  <Button variant="outline">Print View</Button>
                </Link>
                <a href={`mailto:operations@mikana.ae?subject=Issue Report: ${branch.name} - ${role.name}`}>
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </a>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Role Description</CardTitle>
              </CardHeader>
                <CardContent>
                <p>{role.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* Responsibilities */}
          <Card className="mb-8">
              <CardHeader>
                <CardTitle>Key Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
              <ul className="space-y-2">
                {role.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{responsibility}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Daily Timeline */}
          <Card id="timeline" className="mb-8 scroll-mt-20">
            <CardHeader>
              <CardTitle>Daily Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyTimeline dailyFlow={role.dailyFlow} />
            </CardContent>
          </Card>

          {/* Checklists */}
          <div id="checklists" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 scroll-mt-20">
            <Card className="page-break-before">
              <CardHeader>
                <CardTitle>Opening Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <Checklist
                  items={role.checklists.opening}
                  branchSlug={branch.slug}
                  roleId={role.roleId}
                  title="Opening Tasks"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <Checklist
                  items={role.checklists.service}
                  branchSlug={branch.slug}
                  roleId={role.roleId}
                  title="Service Tasks"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Closing Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <Checklist
                  items={role.checklists.closing}
                  branchSlug={branch.slug}
                  roleId={role.roleId}
                  title="Closing Tasks"
                />
              </CardContent>
            </Card>
          </div>

          {/* Dos and Don'ts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Do's
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {role.dos.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  Don'ts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {role.donts.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* What Good Looks Like */}
          <Card className="mb-8 page-break-before">
            <CardHeader>
              <CardTitle>What Good Looks Like</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaGallery photos={whatGoodLooksLike} title="Reference Photos" />
            </CardContent>
          </Card>
        </div>

        <Footer />
      </main>
    </div>
  )
}

