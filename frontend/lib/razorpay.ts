/**
 * Razorpay Standard Web Checkout Integration Helper
 */

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface CheckoutOptions {
  amount: number // in Rupees
  currency?: string
  receipt?: string
  notes?: Record<string, any>
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  onSuccess: (response: RazorpayResponse) => void
  onFailure?: (error: any) => void
  onDismiss?: () => void
}

/**
 * Dynamically loads the Razorpay Standard Checkout script (checkout.js)
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false)
    }

    if ((window as any).Razorpay) {
      return resolve(true)
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Initiates standard Razorpay checkout flow:
 * 1. Calls backend /api/create-order
 * 2. Opens official Razorpay payment modal
 * 3. Verifies signature via backend /api/verify-payment on success
 */
export async function initiateRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  const isScriptLoaded = await loadRazorpayScript()
  if (!isScriptLoaded) {
    throw new Error('Failed to load Razorpay payment SDK. Please check your internet connection.')
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const amountInPaise = Math.round(options.amount * 100)

  if (amountInPaise < 100) {
    throw new Error('Minimum order amount must be at least ₹1.00 (100 paise)')
  }

  // STEP 1: Backend - Create Order
  const orderRes = await fetch(`${backendUrl}/api/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: options.currency || 'INR',
      receipt: options.receipt || `order_rcpt_${Date.now()}`,
      notes: options.notes || {},
    }),
  })

  const orderData = await orderRes.json()

  if (!orderRes.ok || !orderData.order_id) {
    throw new Error(orderData.error || 'Failed to create payment order with server')
  }

  const keyId = orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

  if (!keyId) {
    throw new Error('Razorpay Key ID is not configured.')
  }

  // STEP 2: Open Razorpay modal with order_id
  const razorpayOptions = {
    key: keyId,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    name: 'AgriKart',
    description: 'Agricultural Inputs & Products Checkout',
    order_id: orderData.order_id,
    prefill: {
      name: options.customer?.name || '',
      email: options.customer?.email || '',
      contact: options.customer?.phone || '',
    },
    theme: {
      color: '#059669', // AgriKart emerald green
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss()
        }
      },
    },
    handler: async (response: RazorpayResponse) => {
      try {
        // STEP 3: Backend - Verify Signature
        const verifyRes = await fetch(`${backendUrl}/api/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            receipt: options.receipt,
            notes: options.notes,
          }),
        })

        const verifyData = await verifyRes.json()

        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || 'Payment signature verification failed on server.')
        }

        options.onSuccess(response)
      } catch (err: any) {
        if (options.onFailure) {
          options.onFailure(err)
        }
      }
    },
  }

  const rzp = new (window as any).Razorpay(razorpayOptions)

  rzp.on('payment.failed', (response: any) => {
    if (options.onFailure) {
      options.onFailure(response.error || new Error('Payment failed. Please try again.'))
    }
  })

  rzp.open()
}
