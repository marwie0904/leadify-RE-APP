"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { X, Upload, FileText } from "lucide-react"

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
}

export function FileUpload({ files, onFilesChange, accept, multiple = false, maxFiles }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (multiple) {
        const newFiles = [...files, ...acceptedFiles]
        if (maxFiles && newFiles.length > maxFiles) {
          onFilesChange(newFiles.slice(0, maxFiles))
        } else {
          onFilesChange(newFiles)
        }
      } else {
        onFilesChange(acceptedFiles.slice(0, 1))
      }
    },
    [files, multiple, maxFiles, onFilesChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { [accept]: [] } : undefined,
    multiple,
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Drag & drop files here, or click to select files</p>
            <Button type="button" variant="outline" size="sm">
              Choose Files
            </Button>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files:</h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
