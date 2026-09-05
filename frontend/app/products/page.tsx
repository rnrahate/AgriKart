'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductGrid from '@/components/product-grid'
import SearchAndFilters, { CATEGORIES } from '@/components/search-filters'
import ProductModal from '@/components/product-modal'
import { ProductItem } from '@/lib/api/products'
import {
  FiCheckCircle,
  FiClock,
  FiPercent,
  FiShoppingBag,
  FiFilter,
} from 'react-icons/fi'

function ProductsDashboardContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') || 'All'

  const [filters, setFilters] = useState({
    search: '',
    category: initialCategory,
    availability: 'all',
    priceRange: [0, 50000],
    sortBy: 'featured',
    minRating: 0,
    inStock: false,
  })

  // Sync category if URL parameter changes
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) {
      setFilters((prev) => ({ ...prev, category: cat }))
    }
  }, [searchParams])

  // Quick View / E-Commerce Product Modal state
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenProductModal = (product: ProductItem) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleCloseProductModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Hero / Header Section */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white py-10 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
            <FiCheckCircle size={14} className="text-emerald-300" />
            <span>Govt. Certified & Lab-Tested Inputs</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Agricultural Products Dashboard
              </h1>
              <p className="text-emerald-100/80 text-sm sm:text-base max-w-2xl mt-1">
                Explore certified high-germination seeds, nutrient fertilizers, organic pest controls,
                smart irrigation kits, and farm machinery with direct hub dispatch.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
              <div className="text-center border-r border-white/10 pr-3">
                <p className="font-bold text-base text-white">100%</p>
                <p className="text-emerald-200 text-[10px]">Genuine</p>
              </div>
              <div className="text-center border-r border-white/10 pr-3">
                <p className="font-bold text-base text-white">Express</p>
                <p className="text-emerald-200 text-[10px]">Dispatch</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-base text-white">Cash on</p>
                <p className="text-emerald-200 text-[10px]">Delivery</p>
              </div>
            </div>
          </div>

          {/* Horizontal Category Quick Filter Carousel */}
          <div className="pt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = (filters.category || 'All').toLowerCase() === cat.name.toLowerCase()
              return (
                <button
                  key={cat.name}
                  onClick={() => setFilters((prev) => ({ ...prev, category: cat.name }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-emerald-900 shadow-md scale-105 ring-2 ring-emerald-300'
                      : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60 border border-emerald-700/40'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Quick Toolbar: Availability Pills & Sort */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Availability Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline mr-1 flex-shrink-0">
              Availability:
            </span>

            {[
              { id: 'all', label: 'All Items', icon: <FiShoppingBag size={13} /> },
              { id: 'in_stock', label: 'In Stock', icon: <FiCheckCircle size={13} className="text-emerald-600" /> },
              { id: 'low_stock', label: 'Low Stock', icon: <FiClock size={13} className="text-amber-600" /> },
              { id: 'deals', label: 'Discount Deals', icon: <FiPercent size={13} className="text-rose-600" /> },
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setFilters((prev) => ({ ...prev, availability: status.id }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                  filters.availability === status.id
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {status.icon}
                <span>{status.label}</span>
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <label htmlFor="sort-select" className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="featured">Featured / Best Match</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Top Customer Rated</option>
              <option value="discount">Highest Discount %</option>
            </select>
          </div>
        </div>

        {/* 2-Column Grid: Sidebar Filters & Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <SearchAndFilters filters={filters} setFilters={setFilters} />
          </div>

          {/* Products Grid Column */}
          <div className="lg:col-span-3 space-y-6">
            <ProductGrid
              filters={filters}
              onQuickView={handleOpenProductModal}
            />
          </div>
        </div>
      </div>

      {/* Full-Feature E-Commerce Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseProductModal}
      />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading Agricultural Dashboard...</div>}>
      <ProductsDashboardContent />
    </Suspense>
  )
}
