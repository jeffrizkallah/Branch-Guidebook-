import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import OpenAI from 'openai'

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

// Check if AI is configured
function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

const SYSTEM_PROMPT = `You are a helpful budget assistant for a regional manager at Mikana, a catering and food service company operating multiple school canteen branches in the UAE.

Your role is to help the regional manager:
1. Understand their budget data and spending patterns
2. Identify cost-saving opportunities
3. Forecast future budget needs
4. Make data-driven budget decisions
5. Optimize resource allocation across branches

When responding:
- Be concise but helpful
- Use specific numbers from the provided context when available
- Provide actionable insights and recommendations
- Format currency in AED (UAE Dirhams)
- Consider the operational context of food service businesses (staffing, supplies, maintenance, utilities, equipment)
- Be encouraging about good budget management while being clear about areas needing attention

If the budget data seems to be placeholder/demo data, acknowledge this and explain that more accurate insights will be available once real budget data is imported.`

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only regional managers and admins can use this
    if (!['admin', 'regional_manager'].includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please set OPENAI_API_KEY.' },
        { status: 503 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { message, context, history } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide a message' },
        { status: 400 }
      )
    }

    // Build messages array
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ]

    // Add context about current budget if provided
    if (context) {
      messages.push({
        role: 'system',
        content: `Here is the current budget context:\n\n${context}`
      })
    }

    // Add conversation history if provided
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) { // Last 10 messages
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          })
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message.trim() })

    try {
      const openai = getOpenAIClient()
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })

      const response = completion.choices[0]?.message?.content

      if (!response) {
        return NextResponse.json(
          { error: 'No response received from AI' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        response
      })

    } catch (error) {
      console.error('OpenAI API error:', error)
      
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          return NextResponse.json(
            { error: 'Invalid OpenAI API key' },
            { status: 500 }
          )
        }
        if (error.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again in a moment.' },
            { status: 429 }
          )
        }
      }
      
      throw error
    }

  } catch (error) {
    console.error('Error in budget chat endpoint:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
