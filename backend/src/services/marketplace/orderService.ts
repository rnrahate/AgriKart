/**
 * @fileoverview Order Service - Order management and processing
 * @module src/services/marketplace/orderService
 */

import { createSupabaseAdminClient } from '../../config/supabase';
import { Order, OrderWithItems, OrderItem, OrderStatus, ShippingAddress, PaginatedResponse } from '../../types/marketplace';
import { NotFoundError, DatabaseError, ValidationError, AuthorizationError } from '../../utils/errors';
import { clearCart, getCart } from './cartService';
import { getProductsByIds } from './productService';
import { ShippingAddressInput } from '../../utils/marketplace-validators';

/**
 * Create order from user's cart
 */
export async function createOrder(
  userId: string,
  shippingAddress: ShippingAddressInput
): Promise<OrderWithItems> {
  try {
    // Validate cart
    const cart = await getCart(userId);
    if (cart.item_count === 0) {
      throw new ValidationError('Cannot create order from empty cart');
    }

    const supabase = createSupabaseAdminClient();

    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userId,
          total_amount: cart.total,
          tax_amount: cart.tax,
          discount_amount: cart.discount,
          status: 'pending' as OrderStatus,
          payment_status: 'pending',
          shipping_address: shippingAddress,
        },
      ])
      .select()
      .single();

    if (orderError || !orderData) {
      throw new DatabaseError(`Failed to create order: ${orderError?.message}`);
    }

    const orderId = orderData.id;

    // Create order items from cart
    const orderItems = cart.items.map(cartItem => ({
      order_id: orderId,
      product_id: cartItem.product_id,
      vendor_id: cartItem.vendor_id,
      quantity: cartItem.quantity,
      unit_price: cartItem.product?.price || 0,
      subtotal: (cartItem.product?.price || 0) * cartItem.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // Delete order if items creation fails
      await supabase.from('orders').delete().eq('id', orderId);
      throw new DatabaseError(`Failed to create order items: ${itemsError.message}`);
    }

    // Clear user's cart
    await clearCart(userId);

    // Return order with items
    return getOrderWithItems(orderId);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to create order: ${String(error)}`);
  }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<Order> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Order not found');
    }

    return data as Order;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError(`Failed to get order: ${String(error)}`);
  }
}

/**
 * Get order with items
 */
export async function getOrderWithItems(orderId: string): Promise<OrderWithItems> {
  try {
    const order = await getOrder(orderId);

    const supabase = createSupabaseAdminClient();

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      throw new DatabaseError(`Failed to get order items: ${itemsError.message}`);
    }

    return {
      ...order,
      items: itemsData as OrderItem[],
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to get order with items: ${String(error)}`);
  }
}

/**
 * Get user's order history
 */
export async function getOrderHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<Order>> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError(`Failed to get order history: ${error.message}`);
    }

    return {
      data: data as Order[],
      total: count || 0,
      limit,
      offset,
      has_more: offset + limit < (count || 0),
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to get order history: ${String(error)}`);
  }
}

/**
 * Get vendor's orders (from order items where vendor_id matches)
 */
export async function getVendorOrders(
  vendorId: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<OrderWithItems>> {
  try {
    const supabase = createSupabaseAdminClient();

    // Get distinct order IDs for this vendor
    const { data: orderItemsData, error: itemsError, count } = await supabase
      .from('order_items')
      .select('order_id', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .range(offset, offset + limit - 1);

    if (itemsError) {
      throw new DatabaseError(`Failed to get vendor orders: ${itemsError.message}`);
    }

    if (!orderItemsData || orderItemsData.length === 0) {
      return {
        data: [],
        total: 0,
        limit,
        offset,
        has_more: false,
      };
    }

    const orderIds = [...new Set((orderItemsData as any[]).map(oi => oi.order_id))];

    // Get full orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          product:products(*)
        )
      `)
      .in('id', orderIds)
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw new DatabaseError(`Failed to get orders: ${ordersError.message}`);
    }

    return {
      data: ordersData as OrderWithItems[],
      total: count || 0,
      limit,
      offset,
      has_more: offset + limit < (count || 0),
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to get vendor orders: ${String(error)}`);
  }
}

/**
 * Update order status (authorized users only)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userIdOrVendorId: string,
  isVendor: boolean = false
): Promise<Order> {
  try {
    const order = await getOrder(orderId);

    // Authorization check
    if (!isVendor && order.user_id !== userIdOrVendorId) {
      throw new AuthorizationError('Not authorized to update this order');
    }

    if (isVendor) {
      // Vendor can only mark as shipped/delivered
      if (!['shipped', 'delivered'].includes(newStatus)) {
        throw new ValidationError('Vendors can only update to shipped or delivered');
      }
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[order.status].includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${order.status} to ${newStatus}`
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to update order status: ${error?.message}`);
    }

    return data as Order;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ValidationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to update order status: ${String(error)}`);
  }
}

/**
 * Cancel order (with refund if payment completed)
 */
export async function cancelOrder(
  orderId: string,
  userId: string,
  reason: string
): Promise<Order> {
  try {
    const order = await getOrder(orderId);

    // Verify ownership
    if (order.user_id !== userId) {
      throw new AuthorizationError('Not authorized to cancel this order');
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new ValidationError('Cannot cancel order in this status');
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled' as OrderStatus,
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to cancel order: ${error?.message}`);
    }

    // If payment was completed, process refund (in paymentService)
    if (order.payment_status === 'completed' && order.payment_id) {
      // Refund will be processed by paymentService
      // Update payment status to refunded
      await supabase
        .from('payment_history')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_payment_id', order.payment_id);
    }

    return data as Order;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ValidationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to cancel order: ${String(error)}`);
  }
}

/**
 * Confirm payment and update order status
 * @internal - Called by paymentService after payment verification
 */
export async function confirmPayment(
  orderId: string,
  paymentId: string
): Promise<Order> {
  try {
    const order = await getOrder(orderId);

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: 'completed',
        payment_id: paymentId,
        status: 'confirmed' as OrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to confirm payment: ${error?.message}`);
    }

    // Update inventory for all items in order
    const orderWithItems = await getOrderWithItems(orderId);
    for (const item of orderWithItems.items) {
      // Decrease product inventory
      await supabase.rpc('decrease_product_inventory', {
        product_id: item.product_id,
        quantity: item.quantity,
      });
    }

    return data as Order;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to confirm payment: ${String(error)}`);
  }
}

/**
 * Get order statistics for user
 * @internal - Used for dashboard
 */
export async function getUserOrderStats(userId: string) {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select('status, payment_status')
      .eq('user_id', userId);

    if (error) {
      throw new DatabaseError(`Failed to get order stats: ${error.message}`);
    }

    const orders = data as any[];
    return {
      total_orders: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    };
  } catch (error) {
    throw new DatabaseError(`Failed to get order stats: ${String(error)}`);
  }
}
