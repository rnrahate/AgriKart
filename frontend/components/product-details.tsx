'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  FiStar,
  FiShoppingCart,
  FiHeart,
  FiShare2,
  FiCheck,
  FiTruck,
  FiShield,
  FiRotateCcw,
  FiAward,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiMapPin,
} from 'react-icons/fi'
import { useCart } from '@/lib/store/cartStore'
import { ProductItem } from '@/lib/api/products'

interface ProductDetailsProps {
  product: ProductItem | any
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [deliveryResult, setDeliveryResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'specs' | 'guide' | 'reviews'>('specs')
  const [copiedShare, setCopiedShare] = useState(false)

  const { addItem } = useCart()

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

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
    }
  }

  return (
    <div className="space-y-10">
      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery & Trust Badges */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Large Image Box */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square flex items-center justify-center group shadow-sm">
            <img
              src={images[selectedImageIndex] || product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Status Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discountPercent > 0 && (
                <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
                  {discountPercent}% OFF
                </span>
              )}
              {product.category === 'Organic' && (
                <span className="bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <FiAward size={13} /> 100% Organic
                </span>
              )}
            </div>

            {/* Stock Availability Pill Overlay */}
            <div className="absolute bottom-4 left-4">
              {product.stock_quantity <= 0 ? (
                <span className="bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm flex items-center gap-1.5 shadow">
                  <FiAlertCircle size={14} /> Out of Stock
                </span>
              ) : product.stock_quantity < 10 ? (
                <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5 animate-pulse">
                  <FiClock size={14} /> Only {product.stock_quantity} left in stock!
                </span>
              ) : (
                <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5">
                  <FiCheckCircle size={14} /> In Stock ({product.stock_quantity} units available)
                </span>
              )}
            </div>
          </div>

          {/* Thumbnails Row */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {images.map((img: string, idx: number) => (
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

          {/* Trust Guarantee Cards */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-medium shadow-xs">
              <FiShield className="text-emerald-600 flex-shrink-0" size={20} />
              <span>100% Genuine Certified</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-medium shadow-xs">
              <FiTruck className="text-emerald-600 flex-shrink-0" size={20} />
              <span>Direct Farm Dispatch</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-medium shadow-xs">
              <FiRotateCcw className="text-emerald-600 flex-shrink-0" size={20} />
              <span>7-Day Replacement</span>
            </div>
          </div>
        </div>

        {/* Right: Product Purchase Options & Details */}
        <div className="lg:col-span-6 space-y-6">
          {/* Vendor Tag */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-800 font-semibold">
              <FiCheckCircle className="text-emerald-600" />
              <span>Vendor: {product.vendor?.name || 'Verified Supplier'}</span>
            </div>
            <span className="flex items-center gap-1 text-gray-500">
              <FiMapPin size={13} /> {product.vendor?.location || 'India'}
            </span>
          </div>

          {/* Title */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {product.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 leading-snug">
              {product.name}
            </h1>
          </div>

          {/* Ratings */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
              <span className="font-bold text-amber-800 text-sm">{product.rating || 4.8}</span>
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    size={14}
                    fill={i < Math.floor(product.rating || 4.8) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-600 font-medium">
              {product.reviews_count || product.reviews?.length || 24} verified ratings
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded">
              High Customer Satisfaction
            </span>
          </div>

          {/* Pricing Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/60 via-gray-50 to-white border border-emerald-100 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-gray-900">
                ₹{currentPrice.toLocaleString('en-IN')}
              </span>
              {originalPrice > currentPrice && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    ₹{originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                    Save ₹{savings.toLocaleString('en-IN')} ({discountPercent}% OFF)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Inclusive of all taxes • Free shipping on orders over ₹499
            </p>

            {/* Kisan Discount Coupon */}
            <div className="mt-2 text-xs bg-white p-3 rounded-xl border border-dashed border-emerald-300 flex items-center justify-between text-emerald-900 shadow-xs">
              <span className="font-semibold">
                🌾 Apply code <strong>KISAN10</strong> at checkout for 10% instant rebate!
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Product Overview
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
          </div>

          {/* Variant Selection */}
          {variants.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Select Pack Size / Option:
              </label>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((variant: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition flex items-center gap-2 ${
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

          {/* Delivery Estimator */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-gray-800 font-semibold">
              <FiTruck className="text-emerald-600" size={16} />
              <span>Check Delivery Time to Your Village / Farm PIN Code</span>
            </div>
            <form onSubmit={handleCheckDelivery} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit PIN code"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              />
              <button
                type="submit"
                className="bg-gray-900 hover:bg-black text-white font-semibold px-4 py-2 rounded-xl transition"
              >
                Verify PIN
              </button>
            </form>
            {deliveryResult && (
              <p className="text-xs font-semibold text-emerald-700 pt-1 flex items-center gap-1.5">
                <FiCheck size={14} /> {deliveryResult}
              </p>
            )}
          </div>

          {/* Quantity & Cart Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 overflow-hidden w-36">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!isAvailable || quantity <= 1}
                  className="flex-1 py-3 hover:bg-gray-200 text-gray-700 font-bold transition disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-12 text-center font-bold text-gray-900 text-base">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={!isAvailable || quantity >= product.stock_quantity}
                  className="flex-1 py-3 hover:bg-gray-200 text-gray-700 font-bold transition disabled:opacity-40"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!isAvailable}
                className={`flex-1 py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-md transition ${
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

            {/* Buy Now & Wishlist / Share row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  }}
                  className="sm:col-span-2 text-center py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow hover:shadow-md transition"
                >
                  ⚡ Buy Now with 1-Click
                </Link>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-xs flex items-center justify-center gap-1.5 transition ${
                    isWishlisted
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FiHeart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
                  <span>Wishlist</span>
                </button>
                <button
                  onClick={handleShare}
                  className="px-3.5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                  title="Share product"
                >
                  {copiedShare ? <FiCheck className="text-emerald-600" size={16} /> : <FiShare2 size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Key Features Bullet Highlights */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Key Benefits & Highlights
            </h4>
            <ul className="space-y-2">
              {product.features?.map((feature: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                  <FiCheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={15} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Tabbed In-Depth Sections: Specs, Guide, Reviews */}
      <div className="pt-8 border-t border-gray-200 space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3 px-2 text-sm font-bold border-b-2 transition ${
              activeTab === 'specs'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Technical Specifications
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-2 text-sm font-bold border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Application & Farm Usage Guide
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-2 text-sm font-bold border-b-2 transition ${
              activeTab === 'reviews'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Farmer Reviews ({product.reviews?.length || 0})
          </button>
        </div>

        {/* Tab 1: Specs */}
        {activeTab === 'specs' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Detailed Technical Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl text-xs"
                >
                  <span className="font-semibold text-gray-600">{key}</span>
                  <span className="font-bold text-gray-900 text-right">{val as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Guide */}
        {activeTab === 'guide' && (
          <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-2xl p-6 border border-emerald-100 space-y-4">
            <h3 className="font-bold text-gray-900 text-base">
              Recommended Agricultural Guidelines for Maximum Crop Yield
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-2">
                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center mb-2">
                  1
                </span>
                <h4 className="font-bold text-gray-900 text-sm">Soil Preparation & Moisture</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Prepare fertile, well-drained soil. Ensure appropriate soil moisture before applying seeds or fertilizers.
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-2">
                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center mb-2">
                  2
                </span>
                <h4 className="font-bold text-gray-900 text-sm">Accurate Dilution & Application</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Follow dosage per acre precisely. Use clean sprayer tanks and nozzles to prevent clogging and ensure even coverage.
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-2">
                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center mb-2">
                  3
                </span>
                <h4 className="font-bold text-gray-900 text-sm">Safe Storage & Disposal</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Store remaining input in cool, dry storage away from direct sunlight. Keep away from domestic animals and children.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <div className="text-center md:text-left space-y-1">
                <span className="text-5xl font-black text-gray-900">{product.rating || 4.8}</span>
                <div className="flex text-amber-500 justify-center md:justify-start">
                  {[...Array(5)].map((_, i) => (
                    <FiStar
                      key={i}
                      size={18}
                      fill={i < Math.floor(product.rating || 4.8) ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Based on {product.reviews_count || 120} verified customer reviews
                </p>
              </div>

              {/* Rating Bars */}
              <div className="flex-1 w-full space-y-2 text-xs">
                {[
                  { star: 5, pct: 78 },
                  { star: 4, pct: 14 },
                  { star: 3, pct: 5 },
                  { star: 2, pct: 2 },
                  { star: 1, pct: 1 },
                ].map((item) => (
                  <div key={item.star} className="flex items-center gap-3">
                    <span className="w-12 text-gray-600 font-medium">{item.star} Star</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
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

            {/* Reviews List */}
            <div className="space-y-4">
              {product.reviews?.map((rev: any) => (
                <div key={rev.id} className="p-5 rounded-2xl border border-gray-200 bg-white space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                        {rev.user_name?.charAt(0) || 'K'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{rev.user_name}</p>
                        <p className="text-xs text-gray-500">{rev.location || 'Verified Farmer'}</p>
                      </div>
                    </div>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          size={13}
                          fill={i < rev.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{rev.comment}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <FiCheck size={13} /> Verified Purchase
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
  )
}
