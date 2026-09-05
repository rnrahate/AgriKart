'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/store/cartStore'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  FiCheckCircle,
  FiChevronLeft,
  FiCreditCard,
  FiTruck,
  FiShield,
  FiLock,
  FiAlertCircle,
} from 'react-icons/fi'
import { sanitizeError } from '@/lib/errorUtils'
import { initiateRazorpayCheckout, RazorpayResponse } from '@/lib/razorpay'

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCart()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay')

  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<RazorpayResponse | null>(null)
  const [error, setError] = useState('')

  const subtotal = getTotalPrice()
  const tax = subtotal * 0.18
  const shipping = subtotal > 500 ? 0 : 50
  const grandTotal = subtotal + tax + shipping

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setShippingInfo((prev) => ({ ...prev, [name]: value }))
  }

  // Pre-validate shipping fields before opening payment gateway
  const validateShipping = () => {
    if (!shippingInfo.fullName.trim()) return 'Please enter your full name.'
    if (!shippingInfo.phone.trim()) return 'Please enter a valid phone number.'
    if (!shippingInfo.address.trim()) return 'Please enter your delivery street address.'
    if (!shippingInfo.city.trim()) return 'Please enter your city.'
    if (!shippingInfo.state.trim()) return 'Please enter your state.'
    if (!/^\d{6}$/.test(shippingInfo.zipCode.trim())) {
      return 'Please enter a valid 6-digit PIN code.'
    }
    return null
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('You must be logged in to complete your purchase.')
      return
    }

    const validationError = validateShipping()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsSubmitting(true)

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    // ==========================================
    // Flow 1: Online Payment via Razorpay
    // ==========================================
    if (paymentMethod === 'razorpay') {
      try {
        await initiateRazorpayCheckout({
          amount: grandTotal,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
          customer: {
            name: shippingInfo.fullName,
            email: shippingInfo.email || (user as any).email || '',
            phone: shippingInfo.phone,
          },
          notes: {
            user_id: user.id,
            city: shippingInfo.city,
            items_count: items.length,
          },
          onSuccess: async (razorpayResponse: RazorpayResponse) => {
            try {
              // Create local order in system with verified payment
              await fetch(`${backendUrl}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: user.id,
                  items,
                  total: grandTotal,
                  status: 'processing',
                  payment_status: 'paid',
                  payment_method: 'razorpay',
                  razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                  razorpay_order_id: razorpayResponse.razorpay_order_id,
                  shipping_address: shippingInfo,
                }),
              })
            } catch {
              // Non-blocking order sync
            }

            clearCart()
            setPaymentDetails(razorpayResponse)
            setOrderSuccess(true)
            setIsSubmitting(false)
          },
          onFailure: (err) => {
            setIsSubmitting(false)
            setError(err?.description || err?.message || 'Payment transaction was declined or failed.')
          },
          onDismiss: () => {
            setIsSubmitting(false)
            setError('Payment cancelled. You can retry payment anytime.')
          },
        })
      } catch (err: any) {
        setIsSubmitting(false)
        setError(sanitizeError(err, 'Failed to initialize Razorpay checkout.'))
      }
      return
    }

    // ==========================================
    // Flow 2: Cash on Delivery (COD)
    // ==========================================
    try {
      const response = await fetch(`${backendUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          items,
          total: grandTotal,
          status: 'pending',
          payment_status: 'pending',
          payment_method: 'cod',
          shipping_address: shippingInfo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to place COD order')
      }

      clearCart()
      setPaymentDetails(null)
      setOrderSuccess(true)
    } catch (err: any) {
      setError(sanitizeError(err, 'An error occurred while placing your order. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Empty cart view
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl border border-gray-200 max-w-md shadow-sm space-y-4">
          <div className="text-5xl">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900">Your Cart is Empty</h1>
          <p className="text-gray-600 text-sm">Add agricultural products to your cart before checking out.</p>
          <Link
            href="/products"
            className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 font-semibold transition text-sm"
          >
            Shop Products
          </Link>
        </div>
      </div>
    )
  }

  // Order Success view
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 text-center border border-emerald-100 space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <FiCheckCircle size={44} />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Order Confirmed
            </span>
            <h1 className="text-3xl font-black text-gray-900 mt-2">
              {paymentDetails ? 'Payment Successful!' : 'Order Placed Successfully!'}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Thank you for purchasing with AgriKart. Your agricultural order is now being dispatched from our regional hub.
            </p>
          </div>

          {/* Razorpay Transaction Receipt Details */}
          {paymentDetails && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-gray-900 border-b pb-2">
                <span>Payment Verification</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <FiShield /> Verified by Razorpay
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Payment ID:</span>
                <span className="font-mono font-bold text-gray-900">{paymentDetails.razorpay_payment_id}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Razorpay Order ID:</span>
                <span className="font-mono font-bold text-gray-900">{paymentDetails.razorpay_order_id}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-700">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Link
              href="/products"
              className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition block text-center text-sm shadow-md"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition block text-center text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header navigation */}
        <div className="mb-8">
          <Link
            href="/cart"
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-700 font-semibold transition w-fit text-sm"
          >
            <FiChevronLeft size={18} /> Back to Cart
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3">
            Secure Checkout
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete your shipping information and pay securely with Razorpay or Cash on Delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left: Shipping Details & Payment Option */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-3">
                1. Delivery & Farm Address
              </h2>

              {!user && !authLoading && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-center justify-between">
                  <span>You are not logged in. Please sign in to save your order history.</span>
                  <Link href="/auth/login" className="font-bold underline text-amber-900">
                    Sign In
                  </Link>
                </div>
              )}

              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      placeholder="e.g. Ramesh Patel"
                      value={shippingInfo.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="e.g. 9876543210"
                      value={shippingInfo.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Email Address (For Invoicing)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. farmer@example.com"
                    value={shippingInfo.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Street Address / Farm Landmark *
                  </label>
                  <textarea
                    name="address"
                    rows={3}
                    placeholder="House/Plot number, village or street name, landmark"
                    value={shippingInfo.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      City / District *
                    </label>
                    <input
                      type="text"
                      name="city"
                      placeholder="e.g. Nashik"
                      value={shippingInfo.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      placeholder="e.g. Maharashtra"
                      value={shippingInfo.state}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      6-Digit PIN Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      name="zipCode"
                      placeholder="e.g. 422001"
                      value={shippingInfo.zipCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </form>

              {/* 2. Payment Method Selector */}
              <div className="pt-6 border-t border-gray-200 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">
                  2. Select Payment Method
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Razorpay */}
                  <label
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-2 ${
                      paymentMethod === 'razorpay'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                        <FiCreditCard className="text-emerald-600" size={18} />
                        <span>Online via Razorpay</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Instant & secure checkout with UPI (Google Pay, PhonePe, Paytm), Credit/Debit Card, NetBanking & Wallets.
                    </p>
                    <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 pt-1">
                      <FiLock size={12} /> 256-Bit Bank-Grade Encryption
                    </div>
                  </label>

                  {/* Option 2: Cash on Delivery */}
                  <label
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-2 ${
                      paymentMethod === 'cod'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                        <FiTruck className="text-amber-600" size={18} />
                        <span>Cash on Delivery</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Pay cash to the delivery agent when your agricultural package arrives at your doorstep.
                    </p>
                    <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-1 pt-1">
                      <span>Exact cash requested upon delivery</span>
                    </div>
                  </label>
                </div>

                {paymentMethod === 'razorpay' && (
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-blue-950 text-xs space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-blue-900">
                      <span>🧪 Razorpay Test Mode Guide</span>
                    </p>
                    <p className="text-blue-800 leading-relaxed">
                      Scanning the test QR code with real phone banking apps (GPay, PhonePe, Paytm) will say <strong>&quot;Invalid UPI ID&quot;</strong> because test VPAs only exist inside Razorpay&apos;s sandbox, not on live bank networks.
                    </p>
                    <p className="text-blue-800 pt-0.5 leading-relaxed">
                      👉 <strong>To test in Sandbox:</strong> In the payment modal, select <strong>UPI</strong> &gt; <strong>UPI ID / VPA</strong> and type <code className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">success@razorpay</code>, or choose <strong>Card / NetBanking</strong> and click <strong>Success</strong>.
                    </p>
                    <p className="text-[11px] text-blue-700">
                      To accept real payments via QR code from real customer apps, replace with Razorpay Live Keys (<code className="font-mono">rzp_live_...</code>).
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message Box */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5">
                  <FiAlertCircle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit / Pay Button */}
              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting || !user}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : paymentMethod === 'razorpay' ? (
                  <>
                    <FiLock size={18} />
                    <span>Pay ₹{grandTotal.toFixed(2)} with Razorpay</span>
                  </>
                ) : (
                  <>
                    <FiTruck size={18} />
                    <span>Confirm Order (Cash on Delivery)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <FiShield size={14} className="text-emerald-600" />
                <span>100% Secure Transaction • Backed by AgriKart Guarantee</span>
              </div>
            </div>
          </div>

          {/* Right: Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5 sticky top-8">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-3">
                Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h2>

              <div className="divide-y max-h-72 overflow-y-auto pr-1 scrollbar-thin space-y-2">
                {items.map((item) => (
                  <div key={item.id || item.productId} className="pt-2 flex justify-between gap-3 text-xs">
                    <img
                      src={item.image || '/placeholder.jpg'}
                      alt={item.productName}
                      className="w-12 h-12 object-cover rounded-xl border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{item.productName}</p>
                      <p className="text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-emerald-700 flex-shrink-0">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18% GST)</span>
                  <span className="font-semibold text-gray-900">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-gray-900">
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${shipping}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3 text-base font-extrabold text-gray-900">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 space-y-1">
                <p className="font-bold">🌿 AgriKart Free Shipping</p>
                <p className="text-emerald-800">
                  Orders over ₹500 qualify for free express agricultural shipping.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
