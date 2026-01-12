'use client'

import { useState, useRef, DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, Loader2, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export function ImageUpload({ images, onImagesChange, maxImages = 10 }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      await uploadFiles(files)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      await uploadFiles(files)
    }

    // Reset inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  const uploadFiles = async (files: File[]) => {
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    // Check total file size before upload (Vercel limit is 4.5MB for serverless)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxTotalSize = 4 * 1024 * 1024 // 4MB to stay safely under limit
    
    if (totalSize > maxTotalSize) {
      alert(`Total file size is too large (${(totalSize / 1024 / 1024).toFixed(1)}MB). Please upload smaller images or fewer at a time. Maximum total size is 4MB per upload.`)
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
      })

      // Get response as text first to handle both JSON and non-JSON responses
      const responseText = await response.text()
      
      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `Upload failed (${response.status})`
        
        // Check for common server error messages
        if (response.status === 413 || responseText.toLowerCase().includes('entity too large') || responseText.toLowerCase().includes('request entity')) {
          throw new Error('FILE_TOO_LARGE')
        }
        
        // Try to parse as JSON for structured error
        try {
          const data = JSON.parse(responseText)
          errorMessage = data.error || errorMessage
        } catch {
          // Use plain text if not JSON
          if (responseText) errorMessage = responseText
        }
        
        throw new Error(errorMessage)
      }

      // Parse successful response
      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        console.error('Failed to parse response:', responseText)
        throw new Error('PARSE_ERROR')
      }
      
      onImagesChange([...images, ...data.urls])
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Provide user-friendly messages for common errors
      if (errorMessage === 'FILE_TOO_LARGE') {
        alert('Upload failed: Images are too large. Please use smaller images (under 4MB total) or upload one at a time.')
      } else if (errorMessage === 'PARSE_ERROR' || errorMessage.toLowerCase().includes('unexpected token') || errorMessage.toLowerCase().includes('json')) {
        alert('Upload failed: Server error. The images may be too large. Please try uploading smaller images or one at a time.')
      } else if (errorMessage.toLowerCase().includes('forbidden')) {
        alert('Upload failed: Access denied. Please try again in a moment.')
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('failed to fetch')) {
        alert('Upload failed: Network error. Please check your connection and try again.')
      } else {
        alert(`Upload failed: ${errorMessage}`)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index))
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    cameraInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Upload Options Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleBrowseClick}
          disabled={isUploading}
          className="flex-1 h-14 border-2 hover:border-orange-400 hover:bg-orange-50"
        >
          <Upload className="h-5 w-5 mr-2 text-orange-500" />
          <span className="font-medium">Browse Gallery</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraClick}
          disabled={isUploading}
          className="flex-1 h-14 border-2 hover:border-orange-400 hover:bg-orange-50"
        >
          <Camera className="h-5 w-5 mr-2 text-orange-500" />
          <span className="font-medium">Take Photo</span>
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragging 
            ? "border-orange-500 bg-orange-50" 
            : "border-gray-300 hover:border-orange-400 hover:bg-gray-50",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onClick={handleBrowseClick}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-orange-100 p-3">
              <Upload className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop images here or <span className="text-orange-500">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF (max 4MB total per upload, max {maxImages} images)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden border bg-muted group"
            >
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="object-cover w-full h-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Error'
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage(index)
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !isUploading && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No images uploaded yet</p>
        </div>
      )}
    </div>
  )
}

