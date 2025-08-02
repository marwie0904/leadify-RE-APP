import { z } from 'zod'

// File validation for PDF uploads
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = ['application/pdf']

// Agent creation schema
export const createAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .min(2, 'Agent name must be at least 2 characters')
    .max(50, 'Agent name must be less than 50 characters')
    .trim()
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Agent name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    ),
  tone: z.enum(['Professional', 'Friendly', 'Neutral'], {
    errorMap: () => ({ message: 'Please select a valid tone' })
  }),
  language: z.enum(['English', 'Tagalog'], {
    errorMap: () => ({ message: 'Please select a valid language' })
  }),
  openingMessage: z
    .string()
    .min(1, 'Opening message is required')
    .max(500, 'Opening message must be less than 500 characters')
    .trim(),
  documents: z
    .array(
      z
        .custom<File>()
        .refine((file) => file instanceof File, 'Please upload a valid file')
        .refine((file) => file.size <= MAX_FILE_SIZE, 'File size must be less than 10MB')
        .refine(
          (file) => ACCEPTED_FILE_TYPES.includes(file.type),
          'Only PDF files are allowed'
        )
    )
    .max(5, 'You can upload a maximum of 5 PDF files')
    .optional()
    .default([]),
})

// Agent update schema
export const updateAgentSchema = z.object({
  name: z
    .string()
    .min(2, 'Agent name must be at least 2 characters')
    .max(50, 'Agent name must be less than 50 characters')
    .trim()
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Agent name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .optional(),
  tone: z.enum(['Professional', 'Friendly', 'Neutral'], {
    errorMap: () => ({ message: 'Please select a valid tone' })
  }).optional(),
  language: z.enum(['English', 'Tagalog'], {
    errorMap: () => ({ message: 'Please select a valid language' })
  }).optional(),
  openingMessage: z
    .string()
    .max(500, 'Opening message must be less than 500 characters')
    .trim()
    .optional(),
  active: z.boolean().optional(),
})

// Agent chat preview schema
export const chatPreviewSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be less than 1000 characters')
    .trim(),
})

// Type exports
export type CreateAgentData = z.infer<typeof createAgentSchema>
export type UpdateAgentData = z.infer<typeof updateAgentSchema>
export type ChatPreviewData = z.infer<typeof chatPreviewSchema>