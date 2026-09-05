/**
 * @fileoverview Product Service - Product catalog management
 * @module src/services/marketplace/productService
 */

import { createSupabaseAdminClient } from '../../config/supabase';
import { Product, ProductWithVendor, PaginatedResponse, ProductFilter } from '../../types/marketplace';
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from '../../utils/errors';
import { CreateProductInput, UpdateProductInput } from '../../utils/marketplace-validators';

/**
 * List products with filtering, sorting, and pagination
 */
export async function listProducts(
  filter: ProductFilter
): Promise<PaginatedResponse<ProductWithVendor>> {
  try {
    const supabase = createSupabaseAdminClient();
    const { limit = 20, offset = 0, sort = 'newest' } = filter;

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        vendor:vendors(id, business_name, avatar_url, average_rating)
      `, { count: 'exact' })
      .eq('is_active', true);

    // Apply filters
    if (filter.category_id) {
      query = query.eq('category_id', filter.category_id);
    }

    if (filter.vendor_id) {
      query = query.eq('vendor_id', filter.vendor_id);
    }

    if (filter.min_price !== undefined) {
      query = query.gte('price', filter.min_price);
    }

    if (filter.max_price !== undefined) {
      query = query.lte('price', filter.max_price);
    }

    if (filter.min_rating !== undefined) {
      query = query.gte('average_rating', filter.min_rating);
    }

    // Full-text search with sanitized input
    if (filter.search) {
      const sanitized = filter.search.replace(/[,.()%"'\\]/g, ' ').trim();
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
      }
    }

    // Tag filtering (array contains)
    if (filter.tags && filter.tags.length > 0) {
      // Using &&  operator for array overlap
      for (const tag of filter.tags) {
        query = query.contains('tags', [tag]);
      }
    }

    // Apply sorting
    switch (sort) {
      case 'price-asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price-desc':
        query = query.order('price', { ascending: false });
        break;
      case 'rating':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'popular':
        query = query.order('total_reviews', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new DatabaseError(`Failed to list products: ${error.message}`);
    }

    return {
      data: data as ProductWithVendor[],
      total: count || 0,
      limit,
      offset,
      has_more: offset + limit < (count || 0),
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to list products: ${String(error)}`);
  }
}

/**
 * Get product by ID with vendor details
 */
export async function getProductById(productId: string): Promise<ProductWithVendor> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        vendor:vendors(id, business_name, avatar_url, average_rating)
      `)
      .eq('id', productId)
      .single();

    if (error || !data) {
      throw new NotFoundError(`Product not found: ${productId}`);
    }

    return data as ProductWithVendor;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError(`Failed to get product: ${String(error)}`);
  }
}

/**
 * Create product (vendor only)
 */
export async function createProduct(
  vendorId: string,
  input: CreateProductInput
): Promise<Product> {
  try {
    // Validate vendor exists
    const vendor = await getVendorById(vendorId);
    if (!vendor) {
      throw new AuthorizationError('Vendor not found');
    }

    const supabase = createSupabaseAdminClient();
    const sku = input.sku || `PRD-${Date.now()}`;
    const category = (input as any).category || 'General';

    const richPayload = {
      vendor_id: vendorId,
      category_id: input.category_id,
      category,
      name: input.name,
      description: input.description,
      price: input.price,
      quantity_in_stock: input.quantity_in_stock,
      stock_quantity: input.quantity_in_stock,
      sku,
      image_url: input.image_url || null,
      image: input.image_url || null,
      tags: input.tags || [],
      is_active: true,
    };

    let { data, error } = await supabase
      .from('products')
      .insert([richPayload])
      .select()
      .single();

    if (error) {
      const fallback = await supabase
        .from('products')
        .insert([
          {
            vendor_id: vendorId,
            name: input.name,
            description: input.description,
            category,
            price: input.price,
            stock_quantity: input.quantity_in_stock,
            image: input.image_url || null,
          },
        ])
        .select()
        .single();

      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) {
      throw new DatabaseError(`Failed to create product: ${error?.message}`);
    }

    return data as Product;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to create product: ${String(error)}`);
  }
}

/**
 * Update product (vendor owner only)
 */
export async function updateProduct(
  productId: string,
  vendorId: string,
  input: UpdateProductInput
): Promise<Product> {
  try {
    // Verify ownership
    const product = await getProductById(productId);
    if (product.vendor_id !== vendorId) {
      throw new AuthorizationError('You can only update your own products');
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('products')
      .update({
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.quantity_in_stock !== undefined && { quantity_in_stock: input.quantity_in_stock }),
        ...(input.sku && { sku: input.sku }),
        ...(input.image_url && { image_url: input.image_url }),
        ...(input.tags && { tags: input.tags }),
        ...(input.category_id && { category_id: input.category_id }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to update product: ${error?.message}`);
    }

    return data as Product;
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to update product: ${String(error)}`);
  }
}

/**
 * Delete product (vendor owner only)
 */
export async function deleteProduct(
  productId: string,
  vendorId: string
): Promise<void> {
  try {
    // Verify ownership
    const product = await getProductById(productId);
    if (product.vendor_id !== vendorId) {
      throw new AuthorizationError('You can only delete your own products');
    }

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      throw new DatabaseError(`Failed to delete product: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to delete product: ${String(error)}`);
  }
}

/**
 * Search products with full-text search and filters
 */
export async function searchProducts(
  query: string,
  filter?: Partial<ProductFilter>
): Promise<PaginatedResponse<ProductWithVendor>> {
  try {
    return listProducts({
      ...filter,
      search: query,
    });
  } catch (error) {
    throw new DatabaseError(`Failed to search products: ${String(error)}`);
  }
}

/**
 * Get products by vendor
 */
export async function getVendorProducts(
  vendorId: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaginatedResponse<Product>> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError(`Failed to get vendor products: ${error.message}`);
    }

    return {
      data: data as Product[],
      total: count || 0,
      limit,
      offset,
      has_more: offset + limit < (count || 0),
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to get vendor products: ${String(error)}`);
  }
}

/**
 * Update product inventory
 * @internal - Used by orderService when order is confirmed
 */
export async function updateProductInventory(
  productId: string,
  quantityChange: number
): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.rpc('decrease_product_inventory', {
      product_id: productId,
      quantity: Math.abs(quantityChange),
    });

    if (error) {
      throw new DatabaseError(`Failed to update inventory: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to update inventory: ${String(error)}`);
  }
}

/**
 * Get vendor by ID
 * @internal - Helper function
 */
async function getVendorById(vendorId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Batch get products by IDs
 * @internal - Used by orderService
 */
export async function getProductsByIds(productIds: string[]): Promise<Map<string, Product>> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (error) {
      throw new DatabaseError(`Failed to get products: ${error.message}`);
    }

    const productMap = new Map<string, Product>();
    (data as Product[]).forEach(product => {
      productMap.set(product.id, product);
    });

    return productMap;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to get products: ${String(error)}`);
  }
}
