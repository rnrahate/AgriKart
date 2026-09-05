'use client'

import React, { useState, useEffect } from 'react'
import { getProducts, ProductItem } from '@/lib/api/products'
import ProductCard from './product-card'

interface ProductGridProps {
  filters: any
  onQuickView?: (product: ProductItem) => void
}

export default function ProductGrid({ filters, onQuickView }: ProductGridProps) {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const data = await getProducts(filters)
        if (isMounted) {
          setProducts(data || [])
        }
      } catch (err) {
        console.error('Error in ProductGrid fetching:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchProducts()

    return () => {
      isMounted = false
    }
  }, [filters])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-2xl h-80 p-4 animate-pulse space-y-4 shadow-sm"
          >
            <div className="bg-gray-200 h-44 rounded-xl w-full" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-5 bg-gray-200 rounded w-1/2 pt-2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
        <div className="text-4xl">🌾</div>
        <h3 className="text-lg font-bold text-gray-900">No agricultural products found</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          We couldn&apos;t find any products matching your specific filters or search keywords.
          Try clearing filters or switching categories.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  )
}
