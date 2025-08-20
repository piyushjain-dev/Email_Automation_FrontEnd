'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Download, Play, Copy, Edit3, Save, X } from 'lucide-react'

interface EmailSequence {
  [key: string]: string
}

interface GeneratedResult {
  email: string
  first_name: string
  last_name: string
  company_name: string
  product_id: string
  sequence: EmailSequence
  tokens_used: number
  cost_incurred: number
}

interface EmailViewerProps {
  result: GeneratedResult
  onDownload: () => void
  onActivateCampaign: () => void
  onEmailUpdated?: (updatedResult: GeneratedResult) => void
}

export function EmailViewer({ result, onDownload, onActivateCampaign, onEmailUpdated }: EmailViewerProps) {
  const [currentEmailIndex, setCurrentEmailIndex] = useState(1)
  const [copiedEmail, setCopiedEmail] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [editedSequence, setEditedSequence] = useState<EmailSequence>({ ...result.sequence })

  // Generate a unique key for localStorage based on email and timestamp
  const getStorageKey = () => {
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return `email_edits_${result.email}_${timestamp}`
  }

  // 🔧 CRITICAL FIX: Update editedSequence whenever result changes
  useEffect(() => {
    console.log('🔄 EmailViewer received new result:', result)
    console.log('🔍 Sequence data:', result.sequence)
    console.log('🔍 Current editedSequence before update:', editedSequence)
    
    // Check specific email content for name replacements
    if (result.sequence) {
      console.log('🔍 Checking for name replacements in sequence:')
      Object.keys(result.sequence).forEach(key => {
        if (key.includes('Email_') && !key.includes('Subject')) {
          const content = result.sequence[key]
          console.log(`📧 ${key}:`, content.substring(0, 100) + '...')
        }
      })
    }
    
    // 🎯 FIX: Update editedSequence with new data
    console.log('🔄 Updating editedSequence with new data...')
    setEditedSequence({ ...result.sequence })
    
    // Also update current email display
    const currentEmail = getCurrentEmail()
    if (currentEmail && !isEditing) {
      setEditedSubject(currentEmail.subject)
      setEditedBody(currentEmail.body)
    }
  }, [result, isEditing, currentEmailIndex])

  // Helper function to get current email
  const getCurrentEmail = () => {
    const subject = editedSequence[`Email_${currentEmailIndex}_Subject`]
    const body = editedSequence[`Email_${currentEmailIndex}`]
    if (subject && body) {
      return { subject, body, index: currentEmailIndex }
    }
    return null
  }

  // 🔧 FIX: Update current email when index or sequence changes
  useEffect(() => {
    const currentEmail = getCurrentEmail()
    if (currentEmail && !isEditing) {
      setEditedSubject(currentEmail.subject)
      setEditedBody(currentEmail.body)
    }
  }, [currentEmailIndex, editedSequence, isEditing])

  // Load saved edits from localStorage on component mount
  useEffect(() => {
    const storageKey = getStorageKey()
    const savedEdits = localStorage.getItem(storageKey)
    if (savedEdits) {
      try {
        const parsedEdits = JSON.parse(savedEdits)
        setEditedSequence(parsedEdits)
        console.log('📝 Loaded saved edits from localStorage:', storageKey)
      } catch (error) {
        console.error('❌ Failed to parse saved edits:', error)
      }
    }
  }, [result.email])

  // Save edits to localStorage whenever they change
  const saveToLocalStorage = (sequence: EmailSequence) => {
    const storageKey = getStorageKey()
    try {
      localStorage.setItem(storageKey, JSON.stringify(sequence))
      console.log('💾 Saved edits to localStorage:', storageKey)
    } catch (error) {
      console.error('❌ Failed to save edits to localStorage:', error)
    }
  }
  
  // Extract emails from sequence
  const emails = []
  for (let i = 1; i <= 8; i++) {
    const subject = editedSequence[`Email_${i}_Subject`]
    const body = editedSequence[`Email_${i}`]
    if (subject && body) {
      emails.push({ subject, body, index: i })
    }
  }

  // 🔧 CRITICAL FIX: Get current email directly from editedSequence
  const currentEmail = {
    subject: editedSequence[`Email_${currentEmailIndex}_Subject`] || '',
    body: editedSequence[`Email_${currentEmailIndex}`] || '',
    index: currentEmailIndex
  }
  
  // 🔍 DEBUG: Log what currentEmail contains
  console.log('🔍 Current email data:', {
    index: currentEmailIndex,
    subject: currentEmail.subject,
    body: currentEmail.body?.substring(0, 100) + '...',
    editedSequenceKeys: Object.keys(editedSequence)
  })
  
  const totalEmails = emails.length

  const goToPrevious = () => {
    if (currentEmailIndex > 1) {
      setCurrentEmailIndex(currentEmailIndex - 1)
      setIsEditing(false) // Exit edit mode when changing emails
    }
  }

  const goToNext = () => {
    if (currentEmailIndex < totalEmails) {
      setCurrentEmailIndex(currentEmailIndex + 1)
      setIsEditing(false) // Exit edit mode when changing emails
    }
  }

  const copyEmailToClipboard = async (email: { subject: string; body: string; index: number }) => {
    const emailText = `Subject: ${email.subject}\n\n${email.body}`
    try {
      await navigator.clipboard.writeText(emailText)
      setCopiedEmail(email.index)
      setTimeout(() => setCopiedEmail(null), 2000)
    } catch (error) {
      console.error('Failed to copy email:', error)
    }
  }

  const startEditing = () => {
    if (currentEmail) {
      setEditedSubject(currentEmail.subject)
      setEditedBody(currentEmail.body)
      setIsEditing(true)
    }
  }

  const saveChanges = () => {
    if (currentEmail) {
      const updatedSequence = { ...editedSequence }
      updatedSequence[`Email_${currentEmailIndex}_Subject`] = editedSubject
      updatedSequence[`Email_${currentEmailIndex}`] = editedBody
      setEditedSequence(updatedSequence)
      
      // Save to localStorage
      saveToLocalStorage(updatedSequence)
      
      // Update the result with edited sequence
      const updatedResult = {
        ...result,
        sequence: updatedSequence
      }
      
      // Call the callback if provided
      if (onEmailUpdated) {
        onEmailUpdated(updatedResult)
      }
      
      setIsEditing(false)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    if (currentEmail) {
      setEditedSubject(currentEmail.subject)
      setEditedBody(currentEmail.body)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generated Emails</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={currentEmailIndex === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {currentEmailIndex} / {totalEmails}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              disabled={currentEmailIndex === totalEmails}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 🔧 CRITICAL FIX: Add key to force re-render when sequence changes */}
        <div key={JSON.stringify(editedSequence)}>
          {/* Current Email Display */}
          {currentEmail && (
            <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Email {currentEmail.index}</h3>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyEmailToClipboard(currentEmail)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copiedEmail === currentEmail.index ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Subject */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <span className="font-medium text-blue-800">Subject: </span>
                {isEditing ? (
                  <Input
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="mt-2"
                    placeholder="Enter email subject..."
                  />
                ) : (
                  <span className="text-blue-900">{currentEmail.subject}</span>
                )}
              </div>
              
              {/* Body */}
              <div className="bg-white border rounded-lg p-4">
                {isEditing ? (
                  <Textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="min-h-[200px] resize-none"
                    placeholder="Enter email body..."
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                    {currentEmail.body}
                  </pre>
                )}
              </div>

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={saveChanges}
                    size="sm"
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download All
          </Button>
          <Button
            onClick={onActivateCampaign}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4" />
            Activate Campaign
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
