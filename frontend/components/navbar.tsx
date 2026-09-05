'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { FiMenu, FiX, FiShoppingCart, FiUser, FiLogOut, FiSettings, FiChevronDown } from 'react-icons/fi'
import { useCart } from '@/lib/store/cartStore'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { items } = useCart()
  const { user, logout } = useAuth()
  const router = useRouter()
  const isVendor = user?.role === 'vendor'
  const cartCount = isVendor ? 0 : items.length

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
    setDropdownOpen(false)
    router.push('/')
  }

  const getUserInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase()
    if (user?.email) return user.email.charAt(0).toUpperCase()
    return 'U'
  }

  const farmerLinks = [
    { href: '/products', label: 'Products', auth: false },
    { href: '/disease/detect', label: 'Disease Detect', auth: true },
    { href: '/assistant', label: 'AI Assistant', auth: true },
    { href: '/schemes', label: 'Schemes', auth: true },
    { href: '/news', label: 'News', auth: true },
    { href: '/profile?tab=role', label: 'Sell on AgriKart', auth: true },
  ]

  const vendorLinks = [
    { href: '/vendor', label: 'Dashboard', auth: true },
    { href: '/products', label: 'Marketplace', auth: false },
    { href: '/news', label: 'News', auth: true },
  ]

  const navLinks = isVendor ? vendorLinks : farmerLinks

  return (
    <nav className="glass sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 group">
            <span className="text-2xl">🌾</span>
            <span className="text-xl font-extrabold text-green-700 group-hover:text-green-600 transition-colors">
              AgriKart
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks
              .filter(link => !link.auth || user)
              .map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link text-gray-600 hover:text-green-700 font-medium text-sm px-3 py-2 rounded-lg hover:bg-green-50/50 transition-all"
                >
                  {link.label}
                </Link>
              ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">
            {/* Cart */}
            {!isVendor && (
              <Link
                href="/cart"
                className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <FiShoppingCart size={19} className="text-gray-600 group-hover:text-green-600 transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] h-[18px] leading-none">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              /* User Dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all group"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {getUserInitial()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate hidden lg:block">
                    {user.full_name || user.email?.split('@')[0]}
                  </span>
                  <FiChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                <div className={`dropdown-menu z-50 ${dropdownOpen ? 'open' : ''}`}>
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>

                  <div className="py-1.5">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                    >
                      <FiUser size={16} />
                      My Profile
                    </Link>
                    {isVendor && (
                      <Link
                        href="/vendor"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 font-medium transition-colors"
                      >
                        <FiSettings size={16} />
                        Vendor Dashboard
                      </Link>
                    )}
                    <Link
                      href="/profile?tab=settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                    >
                      <FiSettings size={16} />
                      Settings & Preferences
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 py-1.5">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                    >
                      <FiLogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Auth Buttons */
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-600 hover:text-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all active:scale-[0.97] shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {!isVendor && (
              <Link href="/cart" className="relative p-2">
                <FiShoppingCart size={20} className="text-gray-600" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {navLinks
              .filter(link => !link.auth || user)
              .map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

            <div className="border-t border-gray-100 pt-2 mt-2">
              {user ? (
                <>
                  {/* User info in mobile */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      {getUserInitial()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{user.full_name || 'User'}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <FiUser size={16} /> My Profile
                  </Link>
                  {isVendor && (
                    <Link
                      href="/vendor"
                      className="flex items-center gap-3 px-3 py-2.5 text-emerald-700 hover:bg-emerald-50 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <FiSettings size={16} /> Vendor Dashboard
                    </Link>
                  )}
                  <Link
                    href="/profile?tab=settings"
                    className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <FiSettings size={16} /> Settings & Preferences
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors w-full text-left"
                  >
                    <FiLogOut size={16} /> Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    href="/auth/login"
                    className="block text-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block text-center px-3 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-semibold transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
