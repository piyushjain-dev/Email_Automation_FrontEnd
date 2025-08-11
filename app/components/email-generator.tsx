'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, AlertTriangle, X, Loader2, Sparkles } from 'lucide-react'

// IMPORTANT: This URL now points to your local FastAPI backend.
const API_BASE_URL = 'http://localhost:8000/api/v1'

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

interface EmailGeneratorProps {
  productId: string | undefined
  productDescription: string
  onEmailGenerated: (result: GeneratedResult | GeneratedResult[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function EmailGenerator({ 
  productId, 
  productDescription, 
  onEmailGenerated, 
  isLoading, 
  setIsLoading
}: EmailGeneratorProps) {
  const [email, setEmail] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSingleEmailGeneration = async () => {
    if (!email.trim() || (!productId && !productDescription.trim())) return

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Starting single email generation...')
      console.log('📧 Email:', email)
      console.log('🏷️ Product ID:', productId || 'None')
      console.log('📝 Product Description Length:', productDescription.length)
      
      const formData = new FormData()
      formData.append('email', email)
      formData.append('llm_provider', 'openai')
      formData.append('llm_model', 'gpt-4o')
      
      if (productId) {
        formData.append('product_id', productId)
        console.log('✅ Using product ID')
      } else {
        formData.append('product_description', productDescription)
        console.log('✅ Using product description')
      }

      console.log('📡 Sending request to:', `${API_BASE_URL}/generate-sequence`)
      
      const response = await fetch(`${API_BASE_URL}/generate-sequence`, {
        method: 'POST',
        body: formData
      })

      console.log('📨 Response status:', response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Email generation successful!')
        console.log('📊 Tokens used:', result.tokens_used)
        console.log('💰 Cost:', result.cost_incurred)
        onEmailGenerated(result.data)
      } else {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.detail || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        setError(errorMessage)
      }
    } catch (error) {
      console.error('🚨 Error generating email:', error)
      setError('Network error: Could not connect to email generation service')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkEmailGeneration = async () => {
    if (!csvFile || (!productId && !productDescription.trim())) return

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Starting bulk email generation...')
      console.log('📁 CSV File:', csvFile.name, csvFile.size, 'bytes')
      
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('llm_provider', 'openai')
      formData.append('llm_model', 'gpt-4o')
      
      if (productId) {
        formData.append('product_id', productId)
      } else {
        formData.append('product_description', productDescription)
      }

      console.log('📡 Sending bulk request to:', `${API_BASE_URL}/bulk-generate-sequence`)
      
      const response = await fetch(`${API_BASE_URL}/bulk-generate-sequence`, {
        method: 'POST',
        body: formData
      })

      console.log('📨 Bulk response status:', response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Bulk email generation successful!')
        console.log('📊 Full response:', result)
        console.log('📊 Response type:', typeof result)
        console.log('📊 Has results property:', 'results' in result)
        console.log('📊 Results is array:', Array.isArray(result.results))
        console.log('📊 Results length:', result.results?.length)
        
        // The backend returns results in result.results array
        if (result.results && Array.isArray(result.results)) {
          console.log('🔄 Processing results array...')
          console.log('🔄 Raw first result before transformation:', result.results[0])
          console.log('🔄 Raw first result sequence:', result.results[0]?.sequence)
          console.log('🔄 Raw first result sequence keys:', Object.keys(result.results[0]?.sequence || {}))
          
          // Transform the results to match our expected format
          const transformedResults = result.results.map((item: any, index: number) => {
            console.log(`🔄 Transforming item ${index}:`, item)
            console.log(`🔄 Item ${index} sequence:`, item.sequence)
            console.log(`🔄 Item ${index} sequence keys:`, Object.keys(item.sequence || {}))
            
            // Build sequence object from flat email fields
            const sequence: any = {}
            for (let i = 1; i <= 8; i++) {
              const subjectKey = `email_${i}_subject`
              const bodyKey = `email_${i}_body`
              
              if (item[subjectKey] && item[bodyKey]) {
                sequence[`Email_${i}_Subject`] = item[subjectKey]
                sequence[`Email_${i}`] = item[bodyKey]
              }
            }
            
            console.log(`🔄 Built sequence for item ${index}:`, sequence)
            console.log(`🔄 Sequence keys:`, Object.keys(sequence))
            
            return {
              email: item.email,
              first_name: item.first_name || '',
              last_name: item.last_name || '',
              company_name: item.company_name || '',
              product_id: item.product_id || '',
              sequence: sequence,
              tokens_used: item.tokens_used || 0,
              cost_incurred: item.cost_incurred || 0
            }
          })
          
          console.log('🔄 Final transformed results:', transformedResults)
          console.log('🔄 First transformed result sequence:', transformedResults[0]?.sequence)
          console.log('🔄 First transformed result sequence keys:', Object.keys(transformedResults[0]?.sequence || {}))
          console.log('📞 Calling onEmailGenerated with:', transformedResults.length, 'results')
          onEmailGenerated(transformedResults)
        } else {
          console.error('❌ Unexpected response format:', result)
          console.error('❌ Response keys:', Object.keys(result))
          setError('Unexpected response format from server')
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Bulk API Error Response:', errorText)
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.detail || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        setError(errorMessage)
      }
    } catch (error) {
      console.error('🚨 Error generating bulk emails:', error)
      setError('Network error: Could not connect to email generation service')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setMode('bulk')
      setError(null)
    } else {
      setError('Please select a valid CSV file')
    }
  }

  const downloadSampleCSV = () => {
    const csvContent = 'email,first_name,last_name,company_name\njohn@example.com,John,Doe,Example Corp\njane@example.com,Jane,Smith,Sample Inc'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-emails.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const removeCsvFile = () => {
    setCsvFile(null)
    setMode('single')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const canGenerate = () => {
    if (mode === 'single') {
      return email.trim() && (productId || productDescription.trim())
    } else {
      return csvFile && (productId || productDescription.trim())
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Email or Upload List of Emails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={csvFile ? "Email field disabled - CSV file uploaded" : "Enter Email"}
            className="flex-1"
            disabled={!!csvFile}
          />
          
          {/* OR Separator */}
          <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
            <span>OR</span>
          </div>
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
        </div>

        {csvFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-800 font-medium">✓ CSV File Uploaded</span>
                <span className="text-green-600 text-sm">({csvFile.name})</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleCSV}
                  className="text-xs"
                >
                  Download Sample
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeCsvFile}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">Email input field is disabled when CSV file is uploaded</div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">No. of Emails in Sequence: 8</div>
          <Button
            onClick={mode === 'single' ? handleSingleEmailGeneration : handleBulkEmailGeneration}
            disabled={!canGenerate() || isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border">
          <strong>Requirements to generate emails:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li className={email.trim() || csvFile ? 'text-green-600' : 'text-red-600'}>
              {email.trim() || csvFile ? '✓' : '✗'} Enter an email address or upload a CSV file
            </li>
            <li className={productId || productDescription.trim() ? 'text-green-600' : 'text-red-600'}>
              {productId || productDescription.trim() ? '✓' : '✗'} Enter a product description or select a product
            </li>
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
