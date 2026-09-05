/**
 * @fileoverview Payment Service - Razorpay integration and payment history management
 * @module src/services/marketplace/paymentService
 */

import crypto from 'crypto';
import axios from 'axios';
import { createSupabaseAdminClient } from '../../config/supabase';
import { RazorpayOrder, PaymentVerificationRequest, RefundResponse, PaymentHistory } from '../../types/payment';
import { DatabaseError, ValidationError, NotFoundError } from '../../utils/errors';
import { confirmPayment } from './orderService';

// Razorpay Base URL
const RAZORPAY_API_URL = 'https://api.razorpay.com/v1';

/**
 * Get Razorpay authentication headers
 */
function getRazorpayAuthHeaders() {
  const keyId = process.env.RAZORPAY_KEY_ID || 'mock_key_id';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret';
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Initialize a Razorpay order for payment checkout
 */
export async function createRazorpayOrder(
  orderId: string,
  amount: number
): Promise<RazorpayOrder> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Fetch local order to verify status and amount
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new NotFoundError(`Order not found: ${orderId}`);
    }

    if (order.status !== 'pending' || order.payment_status !== 'pending') {
      throw new ValidationError('Order is not in a payable state');
    }

    // 2. Call Razorpay API to create order (amount in paise, INR)
    const amountInPaise = Math.round(amount * 100);
    
    let razorpayOrder: RazorpayOrder;

    if (process.env.NODE_ENV === 'test' || process.env.RAZORPAY_KEY_ID === undefined) {
      // Mock Razorpay Order for testing/development if credentials are not set
      razorpayOrder = {
        id: `order_${crypto.randomBytes(8).toString('hex')}`,
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
        notes: { order_id: orderId },
      };
    } else {
      const response = await axios.post(
        `${RAZORPAY_API_URL}/orders`,
        {
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderId,
          notes: { order_id: orderId },
        },
        {
          headers: getRazorpayAuthHeaders(),
        }
      );
      razorpayOrder = response.data;
    }

    // 3. Log initial transaction to payment_history table
    const { error: historyError } = await supabase
      .from('payment_history')
      .insert([
        {
          order_id: orderId,
          user_id: order.user_id,
          razorpay_order_id: razorpayOrder.id,
          razorpay_payment_id: null,
          amount: amount,
          currency: 'INR',
          status: 'pending',
          method: 'other',
        },
      ]);

    if (historyError) {
      throw new DatabaseError(`Failed to log payment history: ${historyError.message}`);
    }

    return razorpayOrder;
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error;
    
    const status = error.response?.status;
    const message = error.response?.data?.error?.description || error.message;
    throw new DatabaseError(`Razorpay order creation failed (HTTP ${status}): ${message}`);
  }
}

/**
 * Verify signature of Razorpay payment payload
 */
export function verifyPaymentSignature(params: PaymentVerificationRequest): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      if (process.env.NODE_ENV === 'test') return true;
      return false;
    }
    
    // Generate signature using SHA256 HMAC of: order_id + "|" + payment_id
    const secretData = `${params.razorpay_order_id}|${params.razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(secretData)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(params.razorpay_signature)
    );
  } catch {
    return false;
  }
}

/**
 * Process payment callback (verification & order confirmation)
 */
export async function handlePaymentCallback(
  params: PaymentVerificationRequest,
  userId: string
): Promise<PaymentHistory> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Verify Signature
    const isSignatureValid = verifyPaymentSignature(params);
    if (!isSignatureValid) {
      throw new ValidationError('Invalid payment signature');
    }

    // 2. Fetch payment history record by razorpay_order_id
    const { data: paymentRecord, error: fetchError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('razorpay_order_id', params.razorpay_order_id)
      .single();

    if (fetchError || !paymentRecord) {
      throw new NotFoundError(`Payment history not found for order: ${params.razorpay_order_id}`);
    }

    // Double check authorization
    if (paymentRecord.user_id !== userId) {
      throw new ValidationError('Unauthorized payment verification');
    }

    // If already completed, return early
    if (paymentRecord.status === 'completed') {
      return paymentRecord as PaymentHistory;
    }

    // 3. Confirm payment in orderService (this updates orders table and inventory)
    await confirmPayment(paymentRecord.order_id, params.razorpay_payment_id);

    // 4. Update local payment history record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('payment_history')
      .update({
        razorpay_payment_id: params.razorpay_payment_id,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id)
      .select()
      .single();

    if (updateError || !updatedRecord) {
      throw new DatabaseError(`Failed to update payment record: ${updateError?.message}`);
    }

    return updatedRecord as PaymentHistory;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to handle payment callback: ${String(error)}`);
  }
}

/**
 * Process payment refund (vendor cancellation or admin refund)
 */
export async function refundPayment(
  paymentId: string,
  amount: number,
  reason: string
): Promise<RefundResponse> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Verify payment history record
    const { data: paymentRecord, error: fetchError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('razorpay_payment_id', paymentId)
      .single();

    if (fetchError || !paymentRecord) {
      throw new NotFoundError(`Payment history not found for transaction: ${paymentId}`);
    }

    if (paymentRecord.status !== 'completed') {
      throw new ValidationError('Only completed payments can be refunded');
    }

    // 2. Call Razorpay API to process refund
    const amountInPaise = Math.round(amount * 100);
    let razorpayRefund: RefundResponse;

    if (process.env.NODE_ENV === 'test' || process.env.RAZORPAY_KEY_ID === undefined) {
      razorpayRefund = {
        id: `rfnd_${crypto.randomBytes(8).toString('hex')}`,
        entity: 'refund',
        payment_id: paymentId,
        amount: amountInPaise,
        currency: 'INR',
        notes: { reason },
        receipt: null,
        status: 'processed',
        speed_processed: 'normal',
        batch_id: null,
        failure_reason: null,
        acquirer_data: { rrn: null },
        created_at: Math.floor(Date.now() / 1000),
      };
    } else {
      const response = await axios.post(
        `${RAZORPAY_API_URL}/payments/${paymentId}/refund`,
        {
          amount: amountInPaise,
          notes: { reason },
        },
        {
          headers: getRazorpayAuthHeaders(),
        }
      );
      razorpayRefund = response.data;
    }

    // 3. Update payment history status
    const { error: updateError } = await supabase
      .from('payment_history')
      .update({
        status: 'refunded',
        refund_id: razorpayRefund.id,
        refund_amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id);

    if (updateError) {
      throw new DatabaseError(`Failed to update refund state in payment history: ${updateError.message}`);
    }

    return razorpayRefund;
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error;
    
    const status = error.response?.status;
    const message = error.response?.data?.error?.description || error.message;
    throw new DatabaseError(`Razorpay refund failed (HTTP ${status}): ${message}`);
  }
}

/**
 * Fetch paginated payment history for a user
 */
export async function getPaymentHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PaymentHistory[]> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError(`Failed to retrieve payment history: ${error.message}`);
    }

    return (data || []) as PaymentHistory[];
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to fetch payment history: ${String(error)}`);
  }
}
