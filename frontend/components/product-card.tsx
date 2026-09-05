'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  FiStar,
  FiShoppingCart,
  FiHeart,
  FiEye,
  FiCheck,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi'
import { useCart } from '@/lib/store/cartStore'
import { ProductItem } from '@/lib/api/products'

interface ProductCardProps {
  product: ProductItem | any
  onQuickView?: (product: ProductItem) => void
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const { addItem } = useCart()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (product.stock_quantity <= 0) return

    addItem({
      id: `${product.id}-${product.unit || 'std'}`,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
      vendorId: product.vendor?.name || 'AgriKart Vendor',
    })

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (onQuickView) {
      e.preventDefault()
      onQuickView(product)
    }
  }

  const rating = Number(product.rating || product.average_rating || 4.5)
  const inStock = Number(product.stock_quantity ?? 0) > 0
  const isLowStock = inStock && Number(product.stock_quantity ?? 0) < 10
  const originalPrice = product.original_price || Math.round(product.price * 1.25)
  const savings = Math.max(0, originalPrice - product.price)
  const discountPercent = originalPrice > product.price ? Math.round((savings / originalPrice) * 100) : 0

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Product Image Box */}
      <div className="relative h-52 bg-gray-100 overflow-hidden">
        <img
          src={product.image || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top-Left: Availability & Discount Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {/* Availability Status Badge */}
          {!inStock ? (
            <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <FiAlertCircle size={12} /> Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse">
              <FiClock size={12} /> Only {product.stock_quantity} left!
            </span>
          ) : (
            <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <FiCheckCircle size={12} /> In Stock
            </span>
          )}

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow w-fit">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Top-Right: Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsWishlisted(!isWishlisted)
          }}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition z-10 ${
            isWishlisted
              ? 'bg-rose-50 text-rose-600'
              : 'bg-white/90 text-gray-500 hover:text-rose-600 hover:bg-white'
          }`}
          aria-label="Add to wishlist"
        >
          <FiHeart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>

        {/* Hover Quick View Trigger Overlay */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onQuickView) onQuickView(product)
            }}
            className="bg-white/95 hover:bg-white text-gray-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition"
          >
            <FiEye size={15} className="text-emerald-600" />
            Quick View Features
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Category & Vendor Subtitle */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="font-semibold text-emerald-700 uppercase tracking-wider text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
              {product.category}
            </span>
            <span className="truncate max-w-[140px]">
              {product.vendor?.name || 'Verified Vendor'}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-emerald-700 transition">
            {product.name}
          </h3>

          {/* Unit / Pack Size */}
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {product.unit || 'Standard Pack'}
          </p>

          {/* Rating Summary */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <FiStar
                  key={i}
                  size={13}
                  fill={i < Math.floor(rating) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-700">{rating.toFixed(1)}</span>
            <span className="text-[11px] text-gray-400">
              ({product.reviews_count || product.reviews?.length || 18})
            </span>
          </div>
        </div>

        {/* Price & Action Section */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          {/* Pricing */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-gray-900">
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
              {originalPrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{Number(originalPrice).toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[11px] font-bold text-emerald-700">
                Save ₹{savings.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm ${
                isAdded
                  ? 'bg-emerald-700 text-white'
                  : inStock
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isAdded ? (
                <>
                  <FiCheck size={15} /> Added!
                </>
              ) : inStock ? (
                <>
                  <FiShoppingCart size={15} /> Add to Cart
                </>
              ) : (
                'Out of Stock'
              )}
            </button>

            <Link
              href={`/products/${product.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition text-xs font-semibold"
              title="Open full product page"
            >
              <FiEye size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
