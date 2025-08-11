'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

const API_BASE_URL = 'http://localhost:8000/api/v1'

interface Product {
  id: string
  product_name: string
  product_description: string
  user_id: string
  created_at: string
  updated_at: string
}

interface ProductManagerProps {
  onProductCreated: (product: Product) => void
  onCancel: () => void
}

export function ProductManager({ onProductCreated, onCancel }: ProductManagerProps) {
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName.trim() || !productDescription.trim()) return

    setIsSubmitting(true)
    setError(null)
    
    try {
      console.log('Creating product:', { productName, productDescription })
      
      const formData = new FormData()
      formData.append('product_name', productName)
      formData.append('product_description', productDescription)

      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'POST',
        body: formData
      })

      console.log('Create product response status:', response.status)

      if (response.ok) {
        const product = await response.json()
        console.log('Product created successfully:', product)
        onProductCreated(product)
        setProductName('')
        setProductDescription('')
      } else {
        const errorText = await response.text()
        console.error('Error creating product:', errorText)
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.detail || 'Failed to create product')
        } catch {
          setError(`HTTP ${response.status}: ${errorText}`)
        }
      }
    } catch (error) {
      console.error('Network error creating product:', error)
      setError('Network error: Unable to connect to the API server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Description *
            </label>
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Enter detailed product description..."
              className="min-h-[80px]"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isSubmitting || !productName.trim() || !productDescription.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
