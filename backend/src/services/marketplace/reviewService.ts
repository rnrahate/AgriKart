/**
 * @fileoverview Review Service - Product and vendor reviews management
 * @module src/services/marketplace/reviewService
 */

import { createSupabaseAdminClient } from '../../config/supabase';
import { Review, RatingStats, PaginatedResponse } from '../../types/marketplace';
import { DatabaseError, NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors';
import { CreateReviewInput, UpdateReviewInput } from '../../utils/marketplace-validators';

/**
 * Check if the user has purchased the product (delivered status)
 */
async function checkIsVerifiedPurchase(userId: string, productId: string | undefined): Promise<boolean> {
  if (!productId) return false;
  try {
    const supabase = createSupabaseAdminClient();

    // Query order_items joined with orders
    const { data, error } = await supabase
      .from('order_items')
      .select('id, orders!inner(user_id, status)')
      .eq('product_id', productId)
      .eq('orders.user_id', userId)
      .eq('orders.status', 'delivered')
      .limit(1);

    if (error || !data || data.length === 0) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Recalculate average rating and total reviews for product and/or vendor
 */
export async function calculateAverageRating(
  productId: string | null,
  vendorId: string
): Promise<RatingStats> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Calculate for vendor
    const { data: vData, error: vError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('vendor_id', vendorId);

    if (vError) {
      throw new DatabaseError(`Failed to aggregate vendor reviews: ${vError.message}`);
    }

    const vReviews = vData || [];
    const vTotal = vReviews.length;
    const vAvg = vTotal > 0 ? vReviews.reduce((sum, r) => sum + r.rating, 0) / vTotal : 0;
    const roundedVAvg = Math.round(vAvg * 100) / 100;

    // Update vendor table
    const { error: vUpdateError } = await supabase
      .from('vendors')
      .update({
        average_rating: roundedVAvg,
        total_reviews: vTotal,
      })
      .eq('id', vendorId);

    if (vUpdateError) {
      throw new DatabaseError(`Failed to update vendor rating: ${vUpdateError.message}`);
    }

    // 2. Calculate for product if provided
    let pAvg = 0;
    let pTotal = 0;
    const ratingDistribution = {
      five_star: vReviews.filter(r => r.rating === 5).length,
      four_star: vReviews.filter(r => r.rating === 4).length,
      three_star: vReviews.filter(r => r.rating === 3).length,
      two_star: vReviews.filter(r => r.rating === 2).length,
      one_star: vReviews.filter(r => r.rating === 1).length,
    };

    if (productId) {
      const { data: pData, error: pError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId);

      if (pError) {
        throw new DatabaseError(`Failed to aggregate product reviews: ${pError.message}`);
      }

      const pReviews = pData || [];
      pTotal = pReviews.length;
      pAvg = pTotal > 0 ? pReviews.reduce((sum, r) => sum + r.rating, 0) / pTotal : 0;
      const roundedPAvg = Math.round(pAvg * 100) / 100;

      // Update products table
      const { error: pUpdateError } = await supabase
        .from('products')
        .update({
          average_rating: roundedPAvg,
          total_reviews: pTotal,
        })
        .eq('id', productId);

      if (pUpdateError) {
        throw new DatabaseError(`Failed to update product rating: ${pUpdateError.message}`);
      }

      // Compute rating distribution for specific product
      ratingDistribution.five_star = pReviews.filter(r => r.rating === 5).length;
      ratingDistribution.four_star = pReviews.filter(r => r.rating === 4).length;
      ratingDistribution.three_star = pReviews.filter(r => r.rating === 3).length;
      ratingDistribution.two_star = pReviews.filter(r => r.rating === 2).length;
      ratingDistribution.one_star = pReviews.filter(r => r.rating === 1).length;
    }

    return {
      average_rating: productId ? pAvg : vAvg,
      total_reviews: productId ? pTotal : vTotal,
      rating_distribution: ratingDistribution,
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to calculate ratings: ${String(error)}`);
  }
}

/**
 * Create review for product or vendor
 */
export async function createReview(
  userId: string,
  input: CreateReviewInput
): Promise<Review> {
  try {
    const supabase = createSupabaseAdminClient();

    // Verify user profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new ValidationError('User profile not found');
    }

    // Verify vendor exists
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('id', input.vendor_id)
      .single();

    if (!vendor) {
      throw new ValidationError('Vendor not found');
    }

    // If product_id is provided, verify product exists and belongs to this vendor
    if (input.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('id, vendor_id')
        .eq('id', input.product_id)
        .single();

      if (!product) {
        throw new ValidationError('Product not found');
      }

      if (product.vendor_id !== input.vendor_id) {
        throw new ValidationError('Product does not belong to the specified vendor');
      }
    }

    // Check if review already exists from this user for this product/vendor to prevent duplicates
    let duplicateQuery = supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('vendor_id', input.vendor_id);

    if (input.product_id) {
      duplicateQuery = duplicateQuery.eq('product_id', input.product_id);
    } else {
      duplicateQuery = duplicateQuery.is('product_id', null);
    }

    const { data: duplicate } = await duplicateQuery;
    if (duplicate && duplicate.length > 0) {
      throw new ValidationError('You have already reviewed this product/vendor');
    }

    // Check if verified purchase
    const isVerifiedPurchase = await checkIsVerifiedPurchase(userId, input.product_id);

    // Insert review
    const { data: reviewData, error } = await supabase
      .from('reviews')
      .insert([
        {
          user_id: userId,
          product_id: input.product_id || null,
          vendor_id: input.vendor_id,
          rating: input.rating,
          title: input.title,
          content: input.content,
          helpful_count: 0,
          is_verified_purchase: isVerifiedPurchase,
        },
      ])
      .select()
      .single();

    if (error || !reviewData) {
      throw new DatabaseError(`Failed to create review: ${error?.message}`);
    }

    // Recalculate average ratings
    await calculateAverageRating(input.product_id || null, input.vendor_id);

    return {
      ...reviewData,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
    } as Review;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to create review: ${String(error)}`);
  }
}

/**
 * Get reviews for a product
 */
export async function getProductReviews(
  productId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PaginatedResponse<Review>> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error, count } = await supabase
      .from('reviews')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError(`Failed to get product reviews: ${error.message}`);
    }

    return {
      data: (data || []) as Review[],
      total: count || 0,
      limit,
      offset,
      has_more: offset + limit < (count || 0),
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to get product reviews: ${String(error)}`);
  }
}

/**
 * Get reviews for a vendor storefront
 */
export async function getVendorReviews(
  vendorId: string,
  limit: number = 20,
  offset: number = 0
): Promise<PaginatedResponse<Review>> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error, count } = await supabase
      .from('reviews')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError(`Failed to get vendor reviews: ${error.message}`);
    }

    return {
      data: (data || []) as Review[],
      total: count || 0,
      limit,
      offset,
      has_more: offset + limit < (count || 0),
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to get vendor reviews: ${String(error)}`);
  }
}

/**
 * Update review (owner only)
 */
export async function updateReview(
  userId: string,
  reviewId: string,
  input: UpdateReviewInput
): Promise<Review> {
  try {
    const supabase = createSupabaseAdminClient();

    // Fetch existing review
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      throw new NotFoundError('Review not found');
    }

    // Authorization check
    if (review.user_id !== userId) {
      throw new AuthorizationError('Not authorized to edit this review');
    }

    // Update review
    const { data: updatedReview, error } = await supabase
      .from('reviews')
      .update({
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single();

    if (error || !updatedReview) {
      throw new DatabaseError(`Failed to update review: ${error?.message}`);
    }

    // Recalculate average ratings
    await calculateAverageRating(review.product_id, review.vendor_id);

    return updatedReview as Review;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to update review: ${String(error)}`);
  }
}

/**
 * Delete review (owner or admin only)
 */
export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();

    // Fetch existing review
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      throw new NotFoundError('Review not found');
    }

    // Authorization check: either owner or admin role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (review.user_id !== userId && userProfile?.role !== 'admin') {
      throw new AuthorizationError('Not authorized to delete this review');
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      throw new DatabaseError(`Failed to delete review: ${error.message}`);
    }

    // Recalculate average ratings
    await calculateAverageRating(review.product_id, review.vendor_id);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to delete review: ${String(error)}`);
  }
}
