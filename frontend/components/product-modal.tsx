'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FiX,
  FiStar,
  FiShoppingCart,
  FiHeart,
  FiShare2,
  FiCheck,
  FiTruck,
  FiShield,
  FiRotateCcw,
  FiAward,
  FiMapPin,
  FiExternalLink,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi'
import { ProductItem } from '@/lib/api/products'
import { useCart } from '@/lib/store/cartStore'

interface ProductModalProps {
  product: ProductItem | null
  isOpen: boolean
  onClose: () => void
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [deliveryResult, setDeliveryResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'specs' | 'guide' | 'reviews'>('specs')

  const { addItem } = useCart()

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedImageIndex(0)
      setSelectedVariantIndex(0)
      setQuantity(1)
      setIsAdded(false)
      setDeliveryResult(null)
    }
  }, [product])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  const variants = product.variants && product.variants.length > 0
    ? product.variants
    : [{ size: product.unit || 'Standard', price: product.price, original_price: product.original_price || product.price, in_stock: product.stock_quantity > 0 }]

  const activeVariant = variants[selectedVariantIndex] || variants[0]
  const currentPrice = activeVariant.price
  const originalPrice = activeVariant.original_price || Math.round(currentPrice * 1.25)
  const savings = Math.max(0, originalPrice - currentPrice)
  const discountPercent = originalPrice > currentPrice ? Math.round((savings / originalPrice) * 100) : 0
  const isAvailable = product.stock_quantity > 0 && activeVariant.in_stock

  const images = product.additional_images && product.additional_images.length > 0
    ? product.additional_images
    : [product.image]

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${activeVariant.size}`,
      productId: product.id,
      productName: `${product.name} (${activeVariant.size})`,
      price: currentPrice,
      quantity,
      image: product.image,
      vendorId: product.vendor?.name || 'AgriKart Vendor',
    })
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2200)
  }

  const handleCheckDelivery = (e: React.FormEvent) => {
    e.preventDefault()
    if (/^\d{6}$/.test(pinCode.trim())) {
      const today = new Date()
      const deliveryDate = new Date(today.setDate(today.getDate() + 3))
      const dateString = deliveryDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      setDeliveryResult(`FREE Express Delivery by ${dateString} to ${pinCode}`)
    } else {
      setDeliveryResult('Please enter a valid 6-digit Indian PIN code.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      {/* Backdrop click listener */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col border border-gray-100">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-green-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md">
              {product.category}
            </span>
            <span className="text-xs text-gray-500 hidden sm:inline">SKU: {product.sku}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/products/${product.id}`}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition"
              onClick={onClose}
            >
              <span>Full Product Page</span>
              <FiExternalLink size={14} />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              aria-label="Close modal"
            >
              <FiX size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
          {/* Main Grid: Gallery & Product Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Interactive Multi-Angle Gallery */}
            <div className="lg:col-span-6 space-y-4">
              {/* Big Main Image with Badges */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square flex items-center justify-center group shadow-inner">
                <img
                  src={images[selectedImageIndex] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Status Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {discountPercent > 0 && (
                    <span className="bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md tracking-wider">
                      {discountPercent}% OFF
                    </span>
                  )}
                  {product.category === 'Organic' && (
                    <span className="bg-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <FiAward size={12} /> 100% Organic
                    </span>
                  )}
                </div>

                {/* Stock Status Badge Overlay */}
                <div className="absolute bottom-3 left-3">
                  {product.stock_quantity <= 0 ? (
                    <span className="bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm flex items-center gap-1.5 shadow">
                      <FiAlertCircle size={14} /> Out of Stock
                    </span>
                  ) : product.stock_quantity < 10 ? (
                    <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 animate-pulse">
                      <FiClock size={14} /> Only {product.stock_quantity} left in stock!
                    </span>
                  ) : (
                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5">
                      <FiCheckCircle size={14} /> In Stock ({product.stock_quantity} units)
                    </span>
                  )}
                </div>

                {/* Wishlist Button Overlay */}
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md transition ${
                    isWishlisted
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-white/90 text-gray-600 hover:text-rose-600'
                  }`}
                  aria-label="Add to wishlist"
                >
                  <FiHeart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition ${
                      selectedImageIndex === idx
                        ? 'border-emerald-600 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:border-gray-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Trust Badges Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 text-gray-700 text-xs font-medium">
                  <FiShield className="text-emerald-600 flex-shrink-0" size={18} />
                  <span>100% Genuine Certified</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 text-gray-700 text-xs font-medium">
                  <FiTruck className="text-emerald-600 flex-shrink-0" size={18} />
                  <span>Direct Farm Shipping</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 text-gray-700 text-xs font-medium">
                  <FiRotateCcw className="text-emerald-600 flex-shrink-0" size={18} />
                  <span>7-Day Replacement</span>
                </div>
              </div>
            </div>

            {/* Right: Product Details & Buying Actions */}
            <div className="lg:col-span-6 space-y-5">
              {/* Vendor & Rating */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                  <FiCheckCircle size={13} className="text-emerald-600" />
                  <span>Verified Vendor: <strong>{product.vendor.name}</strong></span>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center text-amber-600">
                    ★ {product.vendor.rating}
                  </span>
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiMapPin size={12} /> {product.vendor.location}
                </span>
              </div>

              {/* Product Title */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                {product.name}
              </h2>

              {/* Rating & Social Proof */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  <span className="font-bold text-amber-800 text-sm">{product.rating}</span>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        size={14}
                        fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-600 font-medium">
                  {product.reviews_count} verified ratings
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  500+ bought this month
                </span>
              </div>

              {/* Price Block */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 via-gray-50 to-white border border-emerald-100 space-y-1.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900">
                    ₹{currentPrice.toLocaleString('en-IN')}
                  </span>
                  {originalPrice > currentPrice && (
                    <>
                      <span className="text-lg text-gray-400 line-through">
                        ₹{originalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Save ₹{savings.toLocaleString('en-IN')} ({discountPercent}% OFF)
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Inclusive of all GST & taxes • Free delivery on orders above ₹499
                </p>

                {/* Seasonal Coupon Banner */}
                <div className="mt-2 text-xs bg-white p-2.5 rounded-lg border border-dashed border-emerald-300 flex items-center justify-between text-emerald-900">
                  <span className="font-medium">
                    🌾 Use code <strong>KISAN10</strong> for extra 10% instant discount at checkout
                  </span>
                </div>
              </div>

              {/* Variant / Pack Size Selector */}
              {variants.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Select Pack Size / Option:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedVariantIndex(idx)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition flex items-center gap-2 ${
                          selectedVariantIndex === idx
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span>{variant.size}</span>
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{variant.price.toLocaleString('en-IN')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PIN Code Delivery Checker */}
              <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div className="flex items-center justify-between text-gray-700 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FiTruck className="text-emerald-600" /> Check Delivery to Your Farm / Location
                  </span>
                </div>
                <form onSubmit={handleCheckDelivery} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN code"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-gray-900 hover:bg-black text-white font-semibold px-4 py-1.5 rounded-lg transition"
                  >
                    Check
                  </button>
                </form>
                {deliveryResult && (
                  <p className="text-xs font-medium text-emerald-700 mt-1 flex items-center gap-1">
                    <FiCheck size={14} /> {deliveryResult}
                  </p>
                )}
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                  {/* Quantity Stepper */}
                  <div className="flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 overflow-hidden w-32">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={!isAvailable || quantity <= 1}
                      className="flex-1 py-2.5 hover:bg-gray-200 text-gray-700 font-bold transition disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-bold text-gray-900 text-sm">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={!isAvailable || quantity >= product.stock_quantity}
                      className="flex-1 py-2.5 hover:bg-gray-200 text-gray-700 font-bold transition disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={!isAvailable}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-md transition ${
                      isAdded
                        ? 'bg-emerald-700 text-white'
                        : isAvailable
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <FiCheck size={18} /> Added to Cart!
                      </>
                    ) : (
                      <>
                        <FiShoppingCart size={18} />
                        {isAvailable ? 'Add to Cart' : 'Out of Stock'}
                      </>
                    )}
                  </button>
                </div>

                {/* Buy Now Direct Button */}
                {isAvailable && (
                  <Link
                    href="/checkout"
                    onClick={() => {
                      addItem({
                        id: `${product.id}-${activeVariant.size}`,
                        productId: product.id,
                        productName: `${product.name} (${activeVariant.size})`,
                        price: currentPrice,
                        quantity,
                        image: product.image,
                        vendorId: product.vendor?.name || 'AgriKart Vendor',
                      })
                      onClose()
                    }}
                    className="w-full block text-center py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition"
                  >
                    ⚡ Buy Now with 1-Click
                  </Link>
                )}
              </div>

              {/* Key Features Bullet Highlights */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Key Benefits & Highlights
                </h4>
                <ul className="space-y-1.5">
                  {product.features?.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                      <FiCheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={14} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Tabs: Specs, Application Guide, Reviews */}
          <div className="pt-6 border-t border-gray-200 space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                  activeTab === 'specs'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Technical Specifications
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                  activeTab === 'guide'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                How to Apply & Use
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                  activeTab === 'reviews'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Customer Reviews ({product.reviews?.length || 0})
              </button>
            </div>

            {/* Tab 1: Specifications */}
            {activeTab === 'specs' && (
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications || {}).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center py-2.5 px-3 bg-white rounded-xl border border-gray-100 text-xs"
                    >
                      <span className="font-semibold text-gray-600">{key}</span>
                      <span className="font-bold text-gray-900 text-right">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Farmer Application Guide */}
            {activeTab === 'guide' && (
              <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-2xl p-6 border border-emerald-100 space-y-4">
                <h4 className="font-bold text-gray-900 text-sm">
                  Recommended Best Practices for Optimal Harvest
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                      1
                    </span>
                    <h5 className="font-bold text-gray-900 text-xs">Soil & Weather Preparation</h5>
                    <p className="text-xs text-gray-600">
                      Ensure optimum soil moisture and avoid spraying during peak afternoon heat or rainfall forecast.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                      2
                    </span>
                    <h5 className="font-bold text-gray-900 text-xs">Dosage & Mixing</h5>
                    <p className="text-xs text-gray-600">
                      Mix thoroughly with clean water adhering strictly to the recommended concentration ratio per acre.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                      3
                    </span>
                    <h5 className="font-bold text-gray-900 text-xs">Safety & Storage</h5>
                    <p className="text-xs text-gray-600">
                      Store in a cool, dry place away from direct sunlight. Keep sealed in original moisture-proof pack.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Reviews Breakdown */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Rating Meter Bar */}
                <div className="bg-gray-50 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-8">
                  <div className="text-center md:text-left space-y-1">
                    <span className="text-5xl font-black text-gray-900">{product.rating}</span>
                    <div className="flex text-amber-500 justify-center md:justify-start">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          size={18}
                          fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      Based on {product.reviews_count} verified farmer reviews
                    </p>
                  </div>

                  {/* Rating Bars */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    {[
                      { star: 5, pct: 76 },
                      { star: 4, pct: 16 },
                      { star: 3, pct: 5 },
                      { star: 2, pct: 2 },
                      { star: 1, pct: 1 },
                    ].map((item) => (
                      <div key={item.star} className="flex items-center gap-3">
                        <span className="w-12 text-gray-600 font-medium">{item.star} Star</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-500">{item.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual Reviews */}
                <div className="space-y-4">
                  {product.reviews?.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            {rev.user_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{rev.user_name}</p>
                            <p className="text-[10px] text-gray-500">{rev.location || 'Verified Farmer'}</p>
                          </div>
                        </div>
                        <div className="flex text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <FiStar
                              key={i}
                              size={12}
                              fill={i < rev.rating ? 'currentColor' : 'none'}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <FiCheck size={12} /> Verified Purchase
                        </span>
                        <span>{rev.created_at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>🛡️ Buyer Protection by AgriKart Guarantee</span>
            <span className="hidden sm:inline">• Direct Vendor Dispatch</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
