'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ProductDetails from '@/components/product-details'
import VendorCard from '@/components/vendor-card'
import ProductCard from '@/components/product-card'
import ProductModal from '@/components/product-modal'
import { getProduct, getRecommendedProducts, ProductItem } from '@/lib/api/products'
import { FiChevronRight, FiHome } from 'react-icons/fi'

export default function ProductPage() {
  const params = useParams()
  const productId = params?.id as string

  const [product, setProduct] = useState<ProductItem | null>(null)
  const [recommended, setRecommended] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)

  // Quick view modal for recommended items
  const [modalProduct, setModalProduct] = useState<ProductItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setLoading(true)
      try {
        const [prod, recs] = await Promise.all([
          getProduct(productId),
          getRecommendedProducts(productId),
        ])
        if (isMounted) {
          setProduct(prod)
          setRecommended(recs || [])
        }
      } catch (err) {
        console.error('Failed to load product page:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (productId) {
      loadData()
    }

    return () => {
      isMounted = false
    }
  }, [productId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 space-y-8 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-96 bg-gray-200 rounded-2xl" />
              <div className="h-10 bg-gray-200 rounded w-2/3" />
            </div>
            <div className="h-80 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 max-w-md text-center space-y-4 shadow-sm">
          <div className="text-4xl">🔍</div>
          <h2 className="text-xl font-bold text-gray-900">Product Not Found</h2>
          <p className="text-sm text-gray-500">
            The agricultural input you requested might have been moved or is currently unavailable.
          </p>
          <Link
            href="/products"
            className="inline-block bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition"
          >
            Browse All Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Breadcrumbs Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 flex-wrap">
          <Link href="/" className="hover:text-emerald-700 flex items-center gap-1">
            <FiHome size={14} /> Home
          </Link>
          <FiChevronRight size={12} className="text-gray-400" />
          <Link href="/products" className="hover:text-emerald-700">
            Products
          </Link>
          <FiChevronRight size={12} className="text-gray-400" />
          <Link
            href={`/products?category=${encodeURIComponent(product.category)}`}
            className="hover:text-emerald-700 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded"
          >
            {product.category}
          </Link>
          <FiChevronRight size={12} className="text-gray-400" />
          <span className="text-gray-900 font-semibold truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Main Grid: Details + Vendor Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <ProductDetails product={product} />
          </div>

          {/* Right Column: Vendor Card & Quick Guarantees */}
          <div className="space-y-6">
            <VendorCard vendor={product.vendor} productId={product.id} />
          </div>
        </div>

        {/* Recommended & Frequently Bought Together Products */}
        {recommended.length > 0 && (
          <div className="pt-12 border-t border-gray-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Frequently Bought Together & Recommended
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  Complementary agricultural inputs chosen by farmers who bought {product.name}
                </p>
              </div>
              <Link
                href={`/products?category=${encodeURIComponent(product.category)}`}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View all in {product.category} →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommended.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onQuickView={(p) => {
                    setModalProduct(p)
                    setIsModalOpen(true)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommended Item Quick View Modal */}
      <ProductModal
        product={modalProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setModalProduct(null)
        }}
      />
    </div>
  )
}
