"use client"

import { useState, useEffect } from 'react'

interface CSRFData {
  token: string
  headers: { 'X-CSRF-Token': string }
}

// Generate a random token
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function useCSRF(): CSRFData {
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    // Check if token exists in session storage
    const existingToken = sessionStorage.getItem('csrf-token')
    if (existingToken) {
      setToken(existingToken)
    } else {
      // Generate new token
      const newToken = generateToken()
      sessionStorage.setItem('csrf-token', newToken)
      setToken(newToken)
    }
  }, [])

  return {
    token,
    headers: {
      'X-CSRF-Token': token
    }
  }
}

// Helper function to validate CSRF tokens
export function validateCSRFToken(requestToken: string): boolean {
  const sessionToken = sessionStorage.getItem('csrf-token')
  return requestToken === sessionToken
}

// CSRF Input component for forms
interface CSRFInputProps {
  name?: string
}

export function CSRFInput({ name = 'csrf-token' }: CSRFInputProps) {
  const { token } = useCSRF()
  return <input type="hidden" name={name} value={token} />
}