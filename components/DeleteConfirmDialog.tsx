'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  // Generic props
  title?: string
  description?: string
  // Dispatch-specific props (optional for backwards compatibility)
  dispatchDate?: string
  branchCount?: number
  isDeleting?: boolean
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  dispatchDate,
  branchCount,
  isDeleting = false
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null

  // Determine if this is a dispatch-specific dialog or generic
  const isDispatchDialog = dispatchDate !== undefined && branchCount !== undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <Card className="relative z-10 w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title || 'Delete Dispatch?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {description ? (
              <p className="text-sm">{description}</p>
            ) : (
              <p className="text-sm">
                Are you sure you want to delete this dispatch?
              </p>
            )}
            
            {isDispatchDialog && (
              <>
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                  <div><strong>Delivery Date:</strong> {dispatchDate}</div>
                  <div><strong>Branches:</strong> {branchCount}</div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>⚠️ Warning:</strong> This dispatch will be moved to the archive. 
                    All branch data will be removed from the active system.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1"
            >
              No, Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

