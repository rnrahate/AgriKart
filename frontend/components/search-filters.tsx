'use client'

import React, { useState } from 'react'
import {
  FiSearch,
  FiSliders,
  FiX,
  FiCheckCircle,
  FiClock,
  FiPercent,
  FiRotateCcw,
  FiStar,
} from 'react-icons/fi'
import { searchProducts } from '@/lib/api/products'

export const CATEGORIES = [
  { name: 'All', icon: '🌾' },
  { name: 'Seeds', icon: '🌱' },
  { name: 'Fertilizers', icon: '🧪' },
  { name: 'Pesticides', icon: '🦗' },
  { name: 'Tools', icon: '🔧' },
  { name: 'Irrigation', icon: '💧' },
  { name: 'Equipment', icon: '🚜' },
  { name: 'Machinery', icon: '⚙️' },
  { name: 'Organic', icon: '🍃' },
]

export default function SearchAndFilters({ filters, setFilters }: any) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const handleSearchChange = async (value: string) => {
    setFilters((prev: any) => ({ ...prev, search: value }))
    if (value.trim().length > 1) {
      try {
        const results = await searchProducts(value)
        setSuggestions(results || [])
      } catch {
        setSuggestions([])
      }
    } else {
      setSuggestions([])
    }
  }

  const handleClearSearch = () => {
    setFilters((prev: any) => ({ ...prev, search: '' }))
    setSuggestions([])
  }

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      availability: 'all',
      priceRange: [0, 50000],
      sortBy: 'featured',
      minRating: 0,
      inStock: false,
    })
    setSuggestions([])
  }

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
          <FiSearch className="text-gray-400 mr-2 flex-shrink-0" size={18} />
          <input
            type="text"
            value={filters.search}
            placeholder="Search seeds, fertilizers, sprayers..."
            className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {filters.search && (
            <button
              onClick={handleClearSearch}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              title="Clear search"
            >
              <FiX size={15} />
            </button>
          )}
        </div>

        {/* Live Search Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 overflow-hidden divide-y divide-gray-50">
            {suggestions.map((item: any) => (
              <div
                key={item.id}
                onClick={() => {
                  setFilters((prev: any) => ({ ...prev, search: item.name }))
                  setSuggestions([])
                }}
                className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={item.image}
                    alt=""
                    className="w-7 h-7 rounded object-cover flex-shrink-0"
                  />
                  <span className="font-semibold text-gray-800 line-clamp-1">{item.name}</span>
                </div>
                <span className="font-bold text-emerald-700 flex-shrink-0">
                  ₹{Number(item.price).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filters Toggle Button */}
      <button
        onClick={() => setShowMobileFilters(!showMobileFilters)}
        className="w-full lg:hidden flex items-center justify-center gap-2 bg-white border border-gray-200 py-2.5 px-4 rounded-xl text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50 transition"
      >
        <FiSliders className="text-emerald-600" />
        <span>{showMobileFilters ? 'Hide Filters' : 'Show Filter Options'}</span>
      </button>

      {/* Main Filter Sidebar Container */}
      <div
        className={`${
          showMobileFilters ? 'block' : 'hidden'
        } lg:block bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm space-y-6`}
      >
        {/* Availability Status Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Availability Status
            </h4>
          </div>
          <div className="space-y-1.5">
            {[
              { id: 'all', label: 'All Availability', icon: null },
              { id: 'in_stock', label: 'In Stock Only', icon: <FiCheckCircle className="text-emerald-600" size={13} /> },
              { id: 'low_stock', label: 'Low Stock (< 10 left)', icon: <FiClock className="text-amber-600" size={13} /> },
              { id: 'deals', label: 'Discount Deals & Offers', icon: <FiPercent className="text-rose-600" size={13} /> },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  filters.availability === opt.id
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="availability"
                  checked={filters.availability === opt.id}
                  onChange={() => setFilters((prev: any) => ({ ...prev, availability: opt.id }))}
                  className="text-emerald-600 focus:ring-emerald-500 rounded"
                />
                {opt.icon}
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Categories List */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">
            Category
          </h4>
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setFilters((prev: any) => ({ ...prev, category: cat.name }))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  (filters.category || 'All') === cat.name
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Price Range Slider */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Price Range
            </h4>
            <span className="text-xs font-bold text-emerald-700">
              ₹{filters.priceRange[0]} - ₹{filters.priceRange[1].toLocaleString('en-IN')}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="15000"
            step="200"
            value={filters.priceRange[1]}
            onChange={(e) =>
              setFilters((prev: any) => ({
                ...prev,
                priceRange: [prev.priceRange[0], parseInt(e.target.value)],
              }))
            }
            className="w-full accent-emerald-600 cursor-pointer"
          />

          {/* Quick Price Pills */}
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {[
              { label: 'Under ₹500', max: 500 },
              { label: 'Under ₹2,000', max: 2000 },
              { label: 'Under ₹5,000', max: 5000 },
              { label: 'Any Price', max: 50000 },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  setFilters((prev: any) => ({
                    ...prev,
                    priceRange: [0, p.max],
                  }))
                }
                className={`text-[11px] py-1.5 px-2 rounded-lg font-medium border transition ${
                  filters.priceRange[1] === p.max
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Minimum Rating */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2">
            Customer Rating
          </h4>
          <div className="space-y-1">
            {[
              { val: 4.5, label: '4.5★ & above' },
              { val: 4.0, label: '4.0★ & above' },
              { val: 0, label: 'All Ratings' },
            ].map((r) => (
              <label
                key={r.val}
                className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer py-1 hover:text-emerald-700"
              >
                <input
                  type="radio"
                  name="minRating"
                  checked={Number(filters.minRating || 0) === r.val}
                  onChange={() => setFilters((prev: any) => ({ ...prev, minRating: r.val }))}
                  className="text-emerald-600 focus:ring-emerald-500 rounded"
                />
                <span className="flex items-center gap-1 font-medium">
                  {r.val > 0 && <FiStar size={12} className="text-amber-500 fill-amber-500" />}
                  {r.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Reset All Filters */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleResetFilters}
            className="w-full py-2.5 px-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 flex items-center justify-center gap-2 transition"
          >
            <FiRotateCcw size={14} />
            Reset All Filters
          </button>
        </div>
      </div>
    </div>
  )
}
