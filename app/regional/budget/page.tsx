'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Sparkles,
  Send,
  Loader2,
  Upload,
  FileSpreadsheet,
  Building2,
  Users,
  Package,
  Wrench,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface BudgetCategory {
  id: string
  name: string
  icon: React.ElementType
  allocated: number
  spent: number
  color: string
}

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

// Placeholder budget data - will be replaced with real data from Excel/API later
const PLACEHOLDER_CATEGORIES: BudgetCategory[] = [
  { id: 'staffing', name: 'Staffing', icon: Users, allocated: 150000, spent: 125000, color: 'bg-blue-500' },
  { id: 'supplies', name: 'Supplies & Ingredients', icon: Package, allocated: 80000, spent: 72000, color: 'bg-green-500' },
  { id: 'maintenance', name: 'Maintenance', icon: Wrench, allocated: 25000, spent: 18500, color: 'bg-amber-500' },
  { id: 'utilities', name: 'Utilities', icon: Lightbulb, allocated: 35000, spent: 31000, color: 'bg-purple-500' },
  { id: 'equipment', name: 'Equipment', icon: Building2, allocated: 40000, spent: 22000, color: 'bg-cyan-500' },
]

export default function RegionalBudgetPage() {
  const { user, loading: authLoading } = useAuth({
    required: true,
    allowedRoles: ['admin', 'regional_manager']
  })

  const [categories, setCategories] = useState<BudgetCategory[]>(PLACEHOLDER_CATEGORIES)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'branches' | 'forecast'>('overview')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Calculate totals
  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocated, 0)
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0)
  const totalRemaining = totalAllocated - totalSpent
  const usagePercentage = Math.round((totalSpent / totalAllocated) * 100)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsAiLoading(true)

    try {
      // Build context for AI
      const budgetContext = `
Current Budget Overview:
- Total Allocated: ${formatCurrency(totalAllocated)}
- Total Spent: ${formatCurrency(totalSpent)}
- Remaining: ${formatCurrency(totalRemaining)}
- Usage: ${usagePercentage}%

Budget by Category:
${categories.map(cat => `- ${cat.name}: Allocated ${formatCurrency(cat.allocated)}, Spent ${formatCurrency(cat.spent)} (${Math.round((cat.spent/cat.allocated)*100)}%)`).join('\n')}
`

      const response = await fetch('/api/chat/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: budgetContext,
          history: messages.slice(-10) // Last 10 messages for context
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        // Fallback response if API doesn't exist yet
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I'm your budget assistant. Based on your current budget data:\n\n${budgetContext}\n\nI can help you analyze spending patterns, identify savings opportunities, and forecast future budget needs. What would you like to know?` 
        }])
      }
    } catch (error) {
      // Provide helpful fallback
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I understand you're asking about "${userMessage}". \n\nBased on your current budget:\n- You've spent ${usagePercentage}% of your allocated budget\n- Your largest expense category is ${categories.sort((a,b) => b.spent - a.spent)[0]?.name}\n- You have ${formatCurrency(totalRemaining)} remaining\n\nThe full AI budget assistant will be available once the budget data is imported. For now, I can show you this overview based on the placeholder data.`
      }])
    } finally {
      setIsAiLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading budget planner...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/regional">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-2 rounded-xl bg-purple-100">
            <Wallet className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Budget Planner</h1>
            <p className="text-sm text-muted-foreground">Plan and optimize your regional budget with AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Upload className="h-4 w-4 mr-2" />
            Import Budget
          </Button>
          <Button variant="outline" size="sm" disabled>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Budget Import Coming Soon</p>
              <p className="text-sm text-amber-700">
                The budget data shown is placeholder data for demonstration. Once you import your actual budget from Excel, 
                the AI assistant will provide real insights based on your data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs text-muted-foreground">Total Budget</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalAllocated)}</p>
            <span className="text-xs text-muted-foreground">This period</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-amber-100">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs text-muted-foreground">Spent</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
            <span className="text-xs text-muted-foreground">{usagePercentage}% used</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-100">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs text-muted-foreground">Remaining</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalRemaining)}</p>
            <span className="text-xs text-muted-foreground">{100 - usagePercentage}% left</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-purple-100">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-xs text-muted-foreground">On Track</span>
            </div>
            <p className="text-xl font-bold flex items-center gap-2">
              {usagePercentage <= 85 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Yes
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Review
                </>
              )}
            </p>
            <span className="text-xs text-muted-foreground">Budget status</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Budget Categories */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-purple-600" />
                Budget by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map(category => {
                  const Icon = category.icon
                  const percentage = Math.round((category.spent / category.allocated) * 100)
                  const isOverBudget = category.spent > category.allocated
                  const isNearLimit = percentage >= 85 && !isOverBudget
                  
                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded-lg", category.color.replace('bg-', 'bg-').replace('500', '100'))}>
                            <Icon className={cn("h-4 w-4", category.color.replace('bg-', 'text-'))} />
                          </div>
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(category.spent)}</p>
                          <p className="text-xs text-muted-foreground">of {formatCurrency(category.allocated)}</p>
                        </div>
                      </div>
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            isOverBudget ? "bg-red-500" :
                            isNearLimit ? "bg-amber-500" :
                            category.color
                          )}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn(
                          isOverBudget ? "text-red-600" :
                          isNearLimit ? "text-amber-600" :
                          "text-muted-foreground"
                        )}>
                          {percentage}% used
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(category.allocated - category.spent)} remaining
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Branch Budgets Placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-cyan-600" />
                Branch Budgets
                <Badge variant="secondary" className="text-[10px] ml-2">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Branch-level budget allocation will be available after importing your budget data.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - AI Assistant */}
        <div className="space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Budget AI Assistant
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Ask questions about your budget, get optimization tips, and forecast insights
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm mb-4">Ask me anything about your budget!</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setInputMessage("What's my biggest expense category?")}
                        className="block w-full text-left px-3 py-2 text-sm bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        What's my biggest expense category?
                      </button>
                      <button
                        onClick={() => setInputMessage("How can I optimize my budget?")}
                        className="block w-full text-left px-3 py-2 text-sm bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        How can I optimize my budget?
                      </button>
                      <button
                        onClick={() => setInputMessage("Am I on track to stay within budget?")}
                        className="block w-full text-left px-3 py-2 text-sm bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        Am I on track to stay within budget?
                      </button>
                    </div>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about your budget..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isAiLoading}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isAiLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p>Maintenance spending is 26% under budget - great job!</p>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p>Supplies spending is at 90% - consider reviewing vendor contracts.</p>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p>Overall you're on track to finish 12% under budget this period.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
