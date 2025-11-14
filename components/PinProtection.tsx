'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, AlertCircle } from 'lucide-react'

interface PinProtectionProps {
  children: React.ReactNode
}

const CORRECT_PIN = '1234' // You can change this to any 4-6 digit code

export function PinProtection({ children }: PinProtectionProps) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if PIN is already stored in session
    const storedPin = sessionStorage.getItem('dispatch_pin')
    if (storedPin === CORRECT_PIN) {
      setIsUnlocked(true)
    }
    setIsLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (pin === CORRECT_PIN) {
      sessionStorage.setItem('dispatch_pin', pin)
      setIsUnlocked(true)
    } else {
      setError('Incorrect PIN. Please try again.')
      setPin('')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter PIN to access Dispatch Management
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4 digit PIN"
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Unlock
              </Button>
            </form>

            <div className="mt-4 text-xs text-muted-foreground text-center">
              This page is restricted to authorized personnel only.
              <br />
              Contact IT if you need access.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

