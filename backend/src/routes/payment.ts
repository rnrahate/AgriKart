import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { createSupabaseAdminClient } from '../config/supabase'

export const paymentRouter = Router()

/**
 * Initialize Razorpay SDK client with environment variables
 */
function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not configured')
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

/**
 * POST /api/create-order or /api/payment/create-order
 * 
 * Body:
 * - amount: number in paise (e.g. 50000 for ₹500), minimum 100 paise
 * - currency: string (default 'INR')
 * - receipt: string (optional order/receipt identifier)
 * - notes: object (optional metadata)
 * 
 * Returns:
 * - { order_id, amount, currency, ... }
 */
export async function handleCreateOrder(req: Request, res: Response) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return res.status(401).json({
        success: false,
        error: 'Razorpay API credentials not configured on server',
      })
    }

    const { amount, currency = 'INR', receipt, notes } = req.body

    // Validate amount
    const parsedAmount = Math.round(Number(amount))
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Minimum amount must be at least 100 paise (₹1.00)',
      })
    }

    const razorpay = getRazorpayClient()
    const orderReceipt = receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    // Call Razorpay API: POST https://api.razorpay.com/v1/orders
    const razorpayOrder = await razorpay.orders.create({
      amount: parsedAmount,
      currency: String(currency).toUpperCase(),
      receipt: String(orderReceipt).substring(0, 40),
      notes: notes || {},
    })

    // Optionally log to Supabase payment_history if table is configured
    try {
      const supabase = createSupabaseAdminClient()
      await supabase.from('payment_history').insert([
        {
          order_id: notes?.local_order_id || orderReceipt,
          user_id: req.auth?.userId || notes?.user_id || null,
          razorpay_order_id: razorpayOrder.id,
          amount: parsedAmount / 100,
          currency: razorpayOrder.currency,
          status: 'pending',
          method: 'razorpay_standard',
        },
      ])
    } catch {
      // Non-blocking if table is not seeded
    }

    return res.status(200).json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      key_id: keyId,
    })
  } catch (error: any) {
    console.error('Razorpay create-order error:', error)
    return res.status(500).json({
      success: false,
      error: error?.error?.description || error?.message || 'Failed to create Razorpay order',
    })
  }
}

/**
 * POST /api/verify-payment or /api/payment/verify-payment
 * 
 * Body:
 * - razorpay_order_id: string
 * - razorpay_payment_id: string
 * - razorpay_signature: string
 * 
 * Returns:
 * - { success: true, message: 'Payment verified successfully' }
 */
export async function handleVerifyPayment(req: Request, res: Response) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return res.status(401).json({
        success: false,
        error: 'Razorpay secret key not configured on server',
      })
    }

    const {
      razorpay_order_id = req.body.order_id,
      razorpay_payment_id = req.body.payment_id,
      razorpay_signature = req.body.signature,
      local_order_id,
    } = req.body

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature)',
      })
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex')

    // Constant-time signature comparison to prevent timing attacks
    let isMatch = false
    try {
      const generatedBuffer = Buffer.from(generatedSignature, 'utf-8')
      const receivedBuffer = Buffer.from(razorpay_signature, 'utf-8')
      if (generatedBuffer.length === receivedBuffer.length) {
        isMatch = crypto.timingSafeEqual(generatedBuffer, receivedBuffer)
      }
    } catch {
      isMatch = false
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature. Payment verification failed.',
      })
    }

    // Update database records if present
    try {
      const supabase = createSupabaseAdminClient()
      
      // Update payment_history
      await supabase
        .from('payment_history')
        .update({
          razorpay_payment_id,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', razorpay_order_id)

      // Update orders table if order exists
      const targetOrderId = local_order_id || req.body.receipt
      if (targetOrderId) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetOrderId)
      }
    } catch {
      // Non-blocking
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    })
  } catch (error: any) {
    console.error('Razorpay verify-payment error:', error)
    return res.status(500).json({
      success: false,
      error: error?.message || 'Server error verifying payment',
    })
  }
}

// Router endpoints
paymentRouter.post('/create-order', handleCreateOrder)
paymentRouter.post('/verify-payment', handleVerifyPayment)
paymentRouter.post('/verify', handleVerifyPayment)
