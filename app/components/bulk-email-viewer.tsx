'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  Download, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Edit3, 
  Save, 
  X,
  Search,
  Send,
  Loader2
} from 'lucide-react'

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

interface BulkEmailViewerProps {
  results: GeneratedResult[]
  onDownload: () => void
  onActivateCampaign: () => void
  onEmailUpdated?: (updatedResults: GeneratedResult[]) => void
}

export function BulkEmailViewer({ results, onDownload, onActivateCampaign, onEmailUpdated }: BulkEmailViewerProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<string>('')
  const [currentEmailIndex, setCurrentEmailIndex] = useState<{ [key: string]: number }>({})
  const [copiedEmail, setCopiedEmail] = useState<{ recipient: string; index: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [editedResults, setEditedResults] = useState<GeneratedResult[]>([])
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Initialize with first recipient if available
  useEffect(() => {
    if (results.length > 0) {
      console.log('🔄 Results received, length:', results.length)
      console.log('🔄 Current selectedRecipient:', selectedRecipient)
      
      if (!selectedRecipient) {
        console.log('🔄 Auto-selecting first recipient:', results[0].email)
        setSelectedRecipient(results[0].email)
      }
    }
  }, [results, selectedRecipient])

  // Force refresh when results change to ensure immediate display
  useEffect(() => {
    if (results.length > 0) {
      console.log('🔄 Results changed, forcing refresh')
      // Force a re-render by updating state
      setEditedResults([...results.map(r => ({
        ...r,
        sequence: { ...r.sequence }
      }))])
      
      // Ensure first recipient is selected
      if (!selectedRecipient || !results.find(r => r.email === selectedRecipient)) {
        console.log('🔄 Selecting first recipient due to results change:', results[0].email)
        setSelectedRecipient(results[0].email)
      }
    }
  }, [results])

  const extractEmails = (sequence: EmailSequence) => {
    console.log('🔍 Extracting emails from sequence:', sequence)
    console.log('🔍 Sequence keys:', Object.keys(sequence))
    const emails = []
    for (let i = 1; i <= 8; i++) {
      const subjectKey = `Email_${i}_Subject`
      const bodyKey = `Email_${i}`
      
      const subject = sequence[subjectKey]
      const body = sequence[bodyKey]
      
      console.log(`🔍 Email ${i}:`, { subjectKey, bodyKey, subject: !!subject, body: !!body })
      
      if (subject && body) {
        emails.push({ subject, body, index: i })
        console.log(`✅ Found email ${i}:`, { subject: subject.substring(0, 50) + '...', body: body.substring(0, 50) + '...' })
      } else {
        console.log(`❌ Missing email ${i}:`, { subject: !!subject, body: !!body })
      }
    }
    console.log(`📧 Total emails extracted: ${emails.length}`)
    return emails
  }

  // Filter results based on search query
  const filteredResults = results.filter(result =>
    result.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get current result and emails
  const currentResult = editedResults.find(r => r.email === selectedRecipient)
  const emails = currentResult ? extractEmails(currentResult.sequence) : []
  const currentIndex = currentEmailIndex[selectedRecipient] || 1
  const currentEmail = emails.find(email => email.index === currentIndex)

  // Simple debugging
  console.log('🔍 Bulk Email Viewer Debug:', {
    selectedRecipient,
    resultsLength: results.length,
    editedResultsLength: editedResults.length,
    currentResult: currentResult ? 'Found' : 'Not found',
    emailsLength: emails.length,
    currentEmail: currentEmail ? 'Found' : 'Not found',
    sequenceKeys: currentResult ? Object.keys(currentResult.sequence) : [],
    currentIndex,
    currentEmailIndex
  })

  // Initialize email index when recipient changes
  if (selectedRecipient && !currentEmailIndex[selectedRecipient]) {
    setCurrentEmailIndex(prev => ({ ...prev, [selectedRecipient]: 1 }))
  }

  const goToPrevious = (recipientEmail: string) => {
    const current = currentEmailIndex[recipientEmail] || 1
    if (current > 1) {
      setCurrentEmailIndex(prev => ({ ...prev, [recipientEmail]: current - 1 }))
      setIsEditing(false)
    }
  }

  const goToNext = (recipientEmail: string) => {
    const current = currentEmailIndex[recipientEmail] || 1
    const result = editedResults.find(r => r.email === recipientEmail)
    if (result) {
      const emails = extractEmails(result.sequence)
      if (current < emails.length) {
        setCurrentEmailIndex(prev => ({ ...prev, [recipientEmail]: current + 1 }))
        setIsEditing(false)
      }
    }
  }

  const copyEmailToClipboard = async (email: { subject: string; body: string; index: number }, recipientEmail: string) => {
    const emailText = `Subject: ${email.subject}\n\n${email.body}`
    try {
      await navigator.clipboard.writeText(emailText)
      setCopiedEmail({ recipient: recipientEmail, index: email.index })
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
    if (currentEmail && currentResult) {
      const updatedResults = editedResults.map(result => {
        if (result.email === selectedRecipient) {
          const updatedSequence = { ...result.sequence }
          updatedSequence[`Email_${currentEmail.index}_Subject`] = editedSubject
          updatedSequence[`Email_${currentEmail.index}`] = editedBody
          return { ...result, sequence: updatedSequence }
        }
        return result
      })
      
      setEditedResults(updatedResults)
      setIsEditing(false)
      
      if (onEmailUpdated) {
        onEmailUpdated(updatedResults)
      }
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    if (currentEmail) {
      setEditedSubject(currentEmail.subject)
      setEditedBody(currentEmail.body)
    }
  }

  const handleActivateCampaign = async () => {
    if (!senderName.trim() || !senderEmail.trim() || !campaignName.trim()) {
      setError('Please fill in all required fields')
      return
    }

    // Prevent multiple submissions
    if (isLoading) {
      console.log('⚠️ Campaign already in progress, ignoring click')
      return
    }

    console.log('🚀 Starting campaign activation...')
    setIsLoading(true)
    setError('')
    setSuccess('')

    // Show immediate feedback
    setSuccess('🚀 Starting campaign activation... Please wait while we send your emails.')

    try {
      const campaignData = {
        sender: {
          name: senderName,
          email: senderEmail
        },
        campaign: {
          name: campaignName
        },
        emails: editedResults
      }

      console.log('📧 Sending campaign request:', campaignData)

      const response = await fetch('/api/brevo/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData)
      })

      console.log('📧 Response status:', response.status)
      const result = await response.json()
      console.log('📧 Campaign response:', result)

      if (response.ok) {
        const totalEmails = editedResults.length * 8
        const successMessage = `✅ Campaign activated successfully! Sent ${totalEmails} emails to ${editedResults.length} recipients.`
        console.log('🎉 Campaign success:', successMessage)
        setSuccess(successMessage)
        
        // Keep the success message visible for a few seconds before clearing the form
        setTimeout(() => {
          setShowCampaignForm(false)
          setSenderName('')
          setSenderEmail('')
          setCampaignName('')
        }, 3000) // Keep message visible for 3 seconds
      } else {
        const errorMessage = result.error || 'Failed to activate campaign'
        console.error('❌ Campaign error:', errorMessage)
        setError(errorMessage)
        setSuccess('') // Clear any false success message
      }
    } catch (error) {
      console.error('❌ Campaign network error:', error)
      setError('Failed to activate campaign')
      setSuccess('') // Clear any false success message
    } finally {
      console.log('🏁 Campaign activation completed')
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Bulk Generated Emails ({editedResults.length} recipients)</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download All
            </Button>
            <Button
              onClick={() => setShowCampaignForm(!showCampaignForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4" />
              Activate Campaign
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign Activation Form */}
        {showCampaignForm && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Activate Email Campaign
            </h3>
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-3">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{success}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <span className="font-medium">{success}</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-3">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name *</label>
                <Input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g., Julia, Sales Team"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email *</label>
                <Input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="julia@yourcompany.com"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Q1 Sales Outreach"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="bg-white p-3 rounded border mb-3">
              <div className="text-sm text-gray-600">
                <strong>Campaign Summary:</strong>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                • {editedResults.length} recipients • 8 emails per recipient • Total: {editedResults.length * 8} emails
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCampaignForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleActivateCampaign}
                disabled={isLoading || !senderName.trim() || !senderEmail.trim() || !campaignName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
                type="button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {success.includes('Starting') ? 'Starting...' : 'Activating...'}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Activate Campaign
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Recipient Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Select Recipient:</span>
          <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Choose a recipient..." />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredResults.map((result, index) => (
                    <SelectItem key={result.email} value={result.email}>
                      {result.email}
                    </SelectItem>
                  ))}
                </div>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Email Content */}
        {currentEmail ? (
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
                  onClick={() => copyEmailToClipboard(currentEmail, selectedRecipient)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copiedEmail?.recipient === selectedRecipient && copiedEmail?.index === currentEmail.index ? 'Copied!' : 'Copy'}
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
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-blue-800">
              <h3 className="font-semibold text-lg mb-2">No emails found</h3>
              <p className="text-sm">
                Please check if emails were generated properly.
              </p>
            </div>
          </div>
        )}

        {/* Carousel Navigation at Bottom */}
        {emails.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t">
            <Button
              variant="outline"
              size="lg"
              onClick={() => goToPrevious(selectedRecipient)}
              disabled={currentIndex === 1}
              className="px-6 py-3"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-bold px-6 py-3 bg-blue-100 text-blue-800 rounded-lg border border-blue-200 text-center min-w-[80px]">
              {currentIndex} / {emails.length}
            </span>
            <Button
              variant="outline"
              size="lg"
              onClick={() => goToNext(selectedRecipient)}
              disabled={currentIndex === emails.length}
              className="px-6 py-3"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 