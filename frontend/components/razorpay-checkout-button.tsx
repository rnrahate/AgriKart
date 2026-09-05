'use client'

import React, { useState } from 'react'
import { initiateRazorpayCheckout, RazorpayResponse } from '@/lib/razorpay'
import { FiLock, FiAlertCircle } from 'react-icons/fi'

interface RazorpayCheckoutButtonProps {
  amount: number // in INR
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  notes?: Record<string, any>
  receipt?: string
  disabled?: boolean
  className?: string
  onPaymentSuccess: (response: RazorpayResponse) => void
  onPaymentError?: (error: any) => void
}

export default function RazorpayCheckoutButton({
  amount,
  customer,
  notes,
  receipt,
  disabled = false,
  className = '',
  onPaymentSuccess,
  onPaymentError,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handlePay = async (e: React.MouseEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      await initiateRazorpayCheckout({
        amount,
        customer,
        notes,
        receipt,
        onSuccess: (response) => {
          setLoading(false)
          onPaymentSuccess(response)
        },
        onFailure: (err) => {
          setLoading(false)
          const message = err?.description || err?.message || 'Payment transaction failed'
          setErrorMsg(message)
          if (onPaymentError) onPaymentError(err)
        },
        onDismiss: () => {
          setLoading(false)
          setErrorMsg('Payment window was closed before completion.')
        },
      })
    } catch (err: any) {
      setLoading(false)
      const message = err?.message || 'Failed to initialize Razorpay checkout'
      setErrorMsg(message)
      if (onPaymentError) onPaymentError(err)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled || loading || amount < 1}
        className={
          className ||
          'w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        <FiLock size={18} />
        <span>
          {loading
            ? 'Initializing Secure Payment...'
            : `Pay ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} with Razorpay`}
        </span>
      </button>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <FiAlertCircle size={15} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-1">
        <span>Secured by</span>
        <span className="font-extrabold text-blue-900 tracking-tight">Razorpay</span>
        <span>• UPI, Cards, NetBanking, Wallets</span>
      </div>
    </div>
  )
}
