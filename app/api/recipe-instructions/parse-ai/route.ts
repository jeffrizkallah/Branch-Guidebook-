import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { parseReheatingInstructionsWithAIBatched, isAIConfigured } from '@/lib/reheating-instructions-parser-ai'

// Read recipes to get available recipe IDs for matching
function getAvailableRecipes(): { recipeId: string; name: string }[] {
  try {
    const recipesPath = path.join(process.cwd(), 'data', 'recipes.json')
    const fileContents = fs.readFileSync(recipesPath, 'utf8')
    const recipes = JSON.parse(fileContents)
    return recipes.map((r: { recipeId: string; name: string }) => ({
      recipeId: r.recipeId,
      name: r.name
    }))
  } catch (error) {
    console.error('Error reading recipes:', error)
    return []
  }
}

export async function POST(request: Request) {
  try {
    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    const { rawData } = await request.json()
    
    if (!rawData || typeof rawData !== 'string') {
      return NextResponse.json(
        { error: 'Please provide rawData (pasted Excel content) in the request body' },
        { status: 400 }
      )
    }

    if (rawData.trim().length < 10) {
      return NextResponse.json(
        { error: 'Data is too short. Please paste at least one row of data from Excel.' },
        { status: 400 }
      )
    }

    // Get available recipes for matching
    const availableRecipes = getAvailableRecipes()

    // Parse with AI (uses automatic batching for large datasets)
    const result = await parseReheatingInstructionsWithAIBatched(rawData, availableRecipes)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to parse data with AI',
          batchInfo: result.batchInfo
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      instructionsCount: result.data?.instructions.length || 0,
      batchInfo: result.batchInfo || { processed: 1, total: 1 }
    })

  } catch (error) {
    console.error('Error in AI parsing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if AI is configured
export async function GET() {
  return NextResponse.json({
    configured: isAIConfigured(),
    message: isAIConfigured() 
      ? 'AI parsing is available' 
      : 'OpenAI API key is not configured'
  })
}

