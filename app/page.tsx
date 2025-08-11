'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ProductManager } from './components/product-manager'
import { EmailGenerator } from './components/email-generator'
import { EmailViewer } from './components/email-viewer'
import { BulkEmailViewer } from './components/bulk-email-viewer'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'


// IMPORTANT: This URL now points to your local FastAPI backend.
const API_BASE_URL = 'http://localhost:8000/api/v1'
const USER_ID = 'aa598689-5fb0-4554-af77-aa82bccbd414'

interface Product {
  id: string
  product_name: string
  product_description: string
  user_id: string
  created_at: string
  updated_at: string
}

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

export default function EmailAutomationApp() {
  const { theme, setTheme } = useTheme()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined)
  const [productDescription, setProductDescription] = useState<string>('')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null)
  const [bulkResults, setBulkResults] = useState<GeneratedResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)
  useEffect(() => {
    loadProducts()
  }, [])

  // Debug useEffect to monitor productDescription changes
  useEffect(() => {
    console.log('🔄 productDescription state changed to:', productDescription)
  }, [productDescription])

  const loadProducts = async () => {
    setIsLoadingProducts(true)
    
    try {
      console.log('🔍 Loading products from:', API_BASE_URL)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log('⏰ Request timed out after 10 seconds')
      }, 10000)
      
      const response = await fetch(`${API_BASE_URL}/user/${USER_ID}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      
      clearTimeout(timeoutId)
      console.log('📡 Response received for products. Status:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Products loaded successfully:', data)
        setProducts(Array.isArray(data) ? data : [])
      } else if (response.status === 404) {
        console.log('📭 No products found (404) for user. This is normal for new users or empty databases.')
        setProducts([])
      } else {
        const errorText = await response.text()
        console.error('❌ HTTP Error loading products:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }
    } catch (error) {
      console.error('🚨 Error loading products:', error)
      setProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleProductSelect = async (productId: string) => {
    if (productId === 'none') {
      setSelectedProduct(undefined)
      setProductDescription('')
      setIsEditingDescription(false)
      return
    }
    
    setSelectedProduct(productId)
    setIsEditingDescription(false) // Reset editing state when product changes
    
    if (productId) {
      try {
        console.log('🔍 Loading product details for:', productId)
        const response = await fetch(`${API_BASE_URL}/${productId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ Product details loaded:', data)
          setProductDescription(data.product_description)
        } else {
          console.error('❌ Error loading product details:', response.status)
          setProductDescription('')
        }
      } catch (error) {
        console.error('🚨 Error loading product:', error)
        setProductDescription('')
      }
    } else {
      // Clear selection - allow manual editing
      setProductDescription('')
    }
  }

  const handleProductCreated = (product: Product) => {
    console.log('✅ Product created:', product)
    setProducts([...products, product])
    setSelectedProduct(product.id)
    setProductDescription(product.product_description)
    setIsEditingDescription(false) // Reset editing state for new product
    setShowAddProduct(false)
  }

  const handleProductUpdated = async (productId: string, updatedDescription: string) => {
    setIsUpdatingProduct(true)
    try {
      console.log('🔄 Updating product:', productId, 'with description:', updatedDescription)
      console.log('🔄 Current products state before update:', products)
      
      const formData = new FormData()
      formData.append('product_name', products.find(p => p.id === productId)?.product_name || '')
      formData.append('product_description', updatedDescription)
      formData.append('product_id', productId)
      
      console.log('🔄 FormData contents:')
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`)
      }
      
      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'POST',
        body: formData,
      })
      
      console.log('🔄 API Response status:', response.status)
      
      if (response.ok) {
        const updatedProduct = await response.json()
        console.log('✅ Product updated successfully:', updatedProduct)
        console.log('✅ Updated product description:', updatedProduct.product_description)
        
        // Update the products list with the updated product
        const updatedProducts = products.map(p => p.id === productId ? updatedProduct : p)
        console.log('✅ Updated products array:', updatedProducts)
        setProducts(updatedProducts)
        
        // Update the product description in state
        console.log('✅ Setting product description to:', updatedProduct.product_description)
        setProductDescription(updatedProduct.product_description)
        
        return true
      } else {
        const errorText = await response.text()
        console.error('❌ Error updating product:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
    } catch (error) {
      console.error('🚨 Error updating product:', error)
      return false
    } finally {
      setIsUpdatingProduct(false)
    }
  }

  const handleEmailGenerated = (result: GeneratedResult | GeneratedResult[]) => {
    console.log('📧 handleEmailGenerated called with:', result)
    console.log('📧 Result type:', Array.isArray(result) ? 'Array' : 'Single')
    console.log('📧 Result length:', Array.isArray(result) ? result.length : 'N/A')
    
    if (Array.isArray(result)) {
      console.log('📧 Processing bulk results:', result.length, 'emails')
      console.log('📧 First result sample:', result[0])
      console.log('📧 First result sequence keys:', Object.keys(result[0]?.sequence || {}))
      setBulkResults(result)
      setGeneratedResult(null)
    } else {
      console.log('📧 Processing single result')
      setGeneratedResult(result)
      setBulkResults([])
    }
  }

  const handleSingleEmailUpdated = (updatedResults: GeneratedResult[]) => {
    // For single email, we expect only one result in the array
    if (updatedResults.length > 0) {
      setGeneratedResult(updatedResults[0])
    }
  }

  const handleBulkEmailsUpdated = (updatedResults: GeneratedResult[]) => {
    setBulkResults(updatedResults)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center relative">
          <div className="absolute top-0 right-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full w-10 h-10 p-0"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Personalized Email App</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate AI-powered email sequences for your prospects</p>
        </div>



        {/* Product Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle>Select Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select 
                value={selectedProduct || 'none'} 
                onValueChange={handleProductSelect} 
                disabled={isLoadingProducts}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={
                    isLoadingProducts ? "Loading products..." : 
                    products.length === 0 ? "No products found - create one below" :
                    "Select a product..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Select a product...
                  </SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setShowAddProduct(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add New
              </Button>
            </div>

            {showAddProduct && (
              <ProductManager
                onProductCreated={handleProductCreated}
                onCancel={() => setShowAddProduct(false)}
              />
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Product Description
                </label>
                {selectedProduct && (
                  <div className="flex gap-2">
                    {isEditingDescription ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingDescription(false)
                            // Reset to original product description
                            const product = products.find(p => p.id === selectedProduct)
                            if (product) {
                              setProductDescription(product.product_description)
                            }
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={isUpdatingProduct}
                          onClick={async () => {
                            if (selectedProduct) {
                              const success = await handleProductUpdated(selectedProduct, productDescription)
                              if (success) {
                                setIsEditingDescription(false)
                                console.log('✅ Product description updated successfully')
                              } else {
                                console.error('❌ Failed to update product description')
                                // Optionally show an error message to the user
                              }
                            }
                          }}
                          className="text-xs bg-green-600 hover:bg-green-700"
                        >
                          {isUpdatingProduct ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingDescription(true)}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <Textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Enter product description..."
                className="min-h-[100px]"
                disabled={!!selectedProduct && !isEditingDescription}
              />
              <p className="text-sm text-gray-500 mt-1">
                {selectedProduct 
                  ? isEditingDescription 
                    ? 'Editing product description - click Save Changes to confirm or Cancel to revert' 
                    : 'Product description loaded from selected product (click Edit to modify)'
                  : 'Enter product description manually or select a product above'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Generation Section */}
        <EmailGenerator
          productId={selectedProduct}
          productDescription={productDescription}
          onEmailGenerated={handleEmailGenerated}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />

        {/* Generated Emails Section */}
        {generatedResult && (
          <BulkEmailViewer
            results={[generatedResult]}
            onDownload={() => {
              const emailsText = Object.entries(generatedResult.sequence)
                .filter(([key]) => key.includes('Subject') || key.includes('Email_'))
                .sort(([a], [b]) => {
                  const aNum = parseInt(a.match(/\d+/)?.[0] || '0')
                  const bNum = parseInt(b.match(/\d+/)?.[0] || '0')
                  return aNum - bNum
                })
                .map(([key, value]) => `${key}:
${value}

`)
                .join('')
              
              const blob = new Blob([emailsText], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `email-sequence-${generatedResult.email}.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            onActivateCampaign={() => {
              // This will be handled by the BulkEmailViewer modal
            }}
            onEmailUpdated={handleSingleEmailUpdated}
          />
        )}

        {bulkResults.length > 0 && (
          <BulkEmailViewer
            results={bulkResults}
            onDownload={() => {
              const allEmailsText = bulkResults.map(result => {
                const emailsText = Object.entries(result.sequence)
                  .filter(([key]) => key.includes('Subject') || key.includes('Email_'))
                  .sort(([a], [b]) => {
                    const aNum = parseInt(a.match(/\d+/)?.[0] || '0')
                    const bNum = parseInt(b.match(/\d+/)?.[0] || '0')
                    return aNum - bNum
                  })
                  .map(([key, value]) => `${key}:
${value}

`)
                  .join('')
                
                return `=== ${result.email} ===\n${emailsText}\n`
              }).join('\n')
              
              const blob = new Blob([allEmailsText], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `bulk-email-sequences-${bulkResults.length}-recipients.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            onActivateCampaign={() => {
              // This will be handled by the BulkEmailViewer modal
            }}
            onEmailUpdated={handleBulkEmailsUpdated}
          />
        )}
      </div>
    </div>
  )
}
