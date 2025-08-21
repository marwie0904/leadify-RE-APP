'use client'

import { useState, useCallback, useRef } from 'react'
import { 
  Upload, 
  X, 
  File, 
  Image as ImageIcon, 
  FileText, 
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  Paperclip,
  Eye,
  Download,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface AttachmentFile {
  id: string
  file: File
  type: 'image' | 'document' | 'video' | 'audio' | 'other'
  preview?: string
  uploadProgress?: number
  uploaded?: boolean
  error?: string
}

interface EnhancedAttachmentUploadProps {
  files: AttachmentFile[]
  onFilesChange: (files: AttachmentFile[]) => void
  maxFiles?: number
  maxSizePerFile?: number // in MB
  maxTotalSize?: number // in MB
  allowedTypes?: string[]
  showPreview?: boolean
  allowMultiple?: boolean
  className?: string
  disabled?: boolean
}

const DEFAULT_ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Other
  'application/json', 'application/xml'
]

export function EnhancedAttachmentUpload({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizePerFile = 25, // 25MB
  maxTotalSize = 100, // 100MB
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  showPreview = true,
  allowMultiple = true,
  className,
  disabled = false
}: EnhancedAttachmentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileType = (file: File): AttachmentFile['type'] => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    if (
      file.type === 'application/pdf' ||
      file.type.includes('document') ||
      file.type.includes('sheet') ||
      file.type.includes('presentation') ||
      file.type === 'text/plain' ||
      file.type === 'text/csv'
    ) return 'document'
    return 'other'
  }

  const getFileIcon = (type: AttachmentFile['type']) => {
    switch (type) {
      case 'image': return ImageIcon
      case 'video': return FileVideo
      case 'audio': return FileAudio
      case 'document': return FileText
      default: return File
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed`
    }

    // Check file size
    if (file.size > maxSizePerFile * 1024 * 1024) {
      return `File size exceeds ${maxSizePerFile}MB limit`
    }

    return null
  }

  const validateTotalSize = (newFiles: File[]): string | null => {
    const currentSize = files.reduce((total, f) => total + f.file.size, 0)
    const newSize = newFiles.reduce((total, f) => total + f.size, 0)
    const totalSize = (currentSize + newSize) / (1024 * 1024)

    if (totalSize > maxTotalSize) {
      return `Total file size exceeds ${maxTotalSize}MB limit`
    }

    return null
  }

  const createPreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(file)
      } else {
        resolve(undefined)
      }
    })
  }

  const processFiles = async (newFiles: File[]) => {
    if (disabled) return

    // Validate file count
    if (!allowMultiple && newFiles.length > 1) {
      toast.error('Only one file is allowed')
      return
    }

    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate individual files
    const invalidFiles = newFiles.map(file => ({
      file,
      error: validateFile(file)
    })).filter(result => result.error)

    if (invalidFiles.length > 0) {
      toast.error(invalidFiles[0].error!)
      return
    }

    // Validate total size
    const totalSizeError = validateTotalSize(newFiles)
    if (totalSizeError) {
      toast.error(totalSizeError)
      return
    }

    setUploading(true)

    try {
      const processedFiles: AttachmentFile[] = await Promise.all(
        newFiles.map(async (file) => {
          const preview = await createPreview(file)
          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            type: getFileType(file),
            preview,
            uploadProgress: 0,
            uploaded: false
          }
        })
      )

      // Simulate upload progress for demo
      for (const processedFile of processedFiles) {
        const fileIndex = processedFiles.indexOf(processedFile)
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 50))
          
          const updatedFiles = processedFiles.map(f => 
            f.id === processedFile.id 
              ? { ...f, uploadProgress: progress, uploaded: progress === 100 }
              : f
          )
          
          if (fileIndex === 0) { // Only update on first file to avoid multiple rerenders
            onFilesChange([...files, ...updatedFiles])
          }
        }
      }

      toast.success(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded successfully`)

    } catch (error) {
      console.error('Error processing files:', error)
      toast.error('Failed to process files')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles)
    }
  }, [files, disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeFile = (fileId: string) => {
    if (disabled) return
    const updatedFiles = files.filter(f => f.id !== fileId)
    onFilesChange(updatedFiles)
    toast.success('File removed')
  }

  const previewFile = (file: AttachmentFile) => {
    if (file.type === 'image' && file.preview) {
      // Open image in new tab
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${file.file.name}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
              <img src="${file.preview}" style="max-width:100%;max-height:100%;object-fit:contain;" />
            </body>
          </html>
        `)
      }
    } else {
      toast.info('Preview not available for this file type')
    }
  }

  const downloadFile = (file: AttachmentFile) => {
    const url = URL.createObjectURL(file.file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const totalSize = files.reduce((total, f) => total + f.file.size, 0)
  const totalSizeFormatted = formatFileSize(totalSize)
  const totalSizeProgress = (totalSize / (maxTotalSize * 1024 * 1024)) * 100

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-border",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50",
          files.length === 0 ? "py-12" : "py-6"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "p-3 rounded-full",
            isDragOver ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {uploading ? 'Uploading files...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {allowMultiple ? `Up to ${maxFiles} files` : 'Single file only'} • 
              Max {maxSizePerFile}MB per file • 
              Max {maxTotalSize}MB total
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Attached Files ({files.length}/{maxFiles})
            </h4>
            <div className="text-xs text-muted-foreground">
              {totalSizeFormatted} / {maxTotalSize}MB
            </div>
          </div>
          
          {/* Total Size Progress */}
          <Progress value={totalSizeProgress} className="h-2" />
          
          {/* Files */}
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file.type)
              
              return (
                <Card key={file.id} className="p-3">
                  <div className="flex items-center gap-3">
                    {/* File Icon/Preview */}
                    <div className="flex-shrink-0">
                      {file.type === 'image' && file.preview ? (
                        <div className="relative">
                          <img
                            src={file.preview}
                            alt={file.file.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                          {file.uploaded && (
                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{file.file.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file.size)}
                        </p>
                        {file.uploadProgress !== undefined && file.uploadProgress < 100 && (
                          <Progress value={file.uploadProgress} className="h-1 w-20" />
                        )}
                        {file.uploaded && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Uploaded
                          </Badge>
                        )}
                        {file.error && (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {showPreview && file.type === 'image' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                previewFile(file)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                      )}
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadFile(file)
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(file.id)
                            }}
                            disabled={disabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  
                  {file.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{file.error}</AlertDescription>
                    </Alert>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            Supported: Images, Documents, PDFs, and more
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilesChange([])}
            disabled={disabled || uploading}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}