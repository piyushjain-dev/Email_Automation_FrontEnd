'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, AlertTriangle } from 'lucide-react'

interface GeneratedResult {
  email: string
  first_name: string
  last_name: string
  company_name: string
  product_id: string
  sequence: { [key: string]: string }
  tokens_used: number
  cost_incurred: number
}

interface CampaignActivationModalProps {
  isOpen: boolean
  onClose: () => void
  results: GeneratedResult[]
  onCampaignActivated: () => void
}

export function CampaignActivationModal({ 
  isOpen, 
  onClose, 
  results, 
  onCampaignActivated 
}: CampaignActivationModalProps) {
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleActivateCampaign = async () => {
    if (!senderName.trim() || !senderEmail.trim() || !campaignName.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Prepare campaign data
      const campaignData = {
        sender: {
          name: senderName,
          email: senderEmail
        },
        campaign: {
          name: campaignName,
          recipients: results.length
        },
        emails: results.map(result => ({
          recipient: result.email,
          first_name: result.first_name,
          last_name: result.last_name,
          company_name: result.company_name,
          sequence: result.sequence
        }))
      }

      // Call FastAPI backend
      const response = await fetch('http://localhost:8000/api/v1/activate-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData)
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(true)
        setTimeout(() => {
          onCampaignActivated()
          onClose()
          setSuccess(false)
          setSenderName('')
          setSenderEmail('')
          setCampaignName('')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to activate campaign')
      }
    } catch (error) {
      console.error('Campaign activation error:', error)
      setError('Network error: Could not connect to email service')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setError(null)
      setSuccess(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Activate Email Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                Campaign activated successfully! Emails are being sent.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="senderName">Sender Name *</Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g., Julia, Sales Team"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="senderEmail">Sender Email *</Label>
              <Input
                id="senderEmail"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="julia@yourcompany.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="campaignName">Campaign Name *</Label>
              <Input
                id="campaignName"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Q1 Sales Outreach"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>Campaign Summary:</strong>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              • {results.length} recipients
            </div>
            <div className="text-sm text-gray-500">
              • 8 emails per recipient
            </div>
            <div className="text-sm text-gray-500">
              • Total: {results.length * 8} emails
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleActivateCampaign}
            disabled={isLoading || !senderName.trim() || !senderEmail.trim() || !campaignName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Activate Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 