import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

// Note: Vercel serverless has a 4.5MB body limit (platform limit, not configurable)
// Client-side validation ensures files stay under this limit

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Check total size of all files
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxTotalSize = 4 * 1024 * 1024 // 4MB limit
    
    if (totalSize > maxTotalSize) {
      return NextResponse.json(
        { error: `Total file size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds 4MB limit. Please upload smaller images.` },
        { status: 413 }
      )
    }

    const urls: string[] = []

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue
      }

      // Validate individual file size (4MB max per file)
      if (file.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 4MB limit. Please use a smaller image.` },
          { status: 413 }
        )
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const extension = file.name.split('.').pop() || 'jpg'
      const filename = `recipe-instructions/${timestamp}-${randomStr}.${extension}`

      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: 'public',
      })

      urls.push(blob.url)
    }

    return NextResponse.json({ urls, count: urls.length })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Provide more specific error messages
    if (errorMessage.includes('body size') || errorMessage.includes('entity too large')) {
      return NextResponse.json(
        { error: 'File upload too large. Please use smaller images (under 4MB total).' },
        { status: 413 }
      )
    }
    
    return NextResponse.json(
      { error: `Upload failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
