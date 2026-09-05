'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { FiBarChart2, FiBriefcase, FiFileText, FiPackage, FiPlus, FiSave } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { sanitizeError } from '@/lib/errorUtils'
import { useAuth } from '@/lib/hooks/useAuth'
import { normalizeProduct } from '@/lib/api/products'

type TabType = 'overview' | 'products' | 'news' | 'profile'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default function VendorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [vendor, setVendor] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [profileForm, setProfileForm] = useState({
    business_name: '',
    owner_name: '',
    business_description: '',
    business_type: '',
    registration_number: '',
    gst_number: '',
    business_phone: '',
    business_email: '',
    business_address: '',
    city: '',
    state: '',
    pincode: '',
    website_url: '',
    years_in_business: '',
    service_areas: '',
    support_contact: '',
  })

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: 'Seeds',
    price: '',
    stock_quantity: '',
    image: '',
  })

  const [articleForm, setArticleForm] = useState({
    title: '',
    description: '',
    content: '',
    category: 'market',
    featured_image_url: '',
  })

  const vendorId = vendor?.id || user?.id

  useEffect(() => {
    if (!user) return
    loadDashboard()
  }, [user])

  const loadDashboard = async () => {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle()

      const nextVendor = vendorData || { id: user.id, user_id: user.id, owner_name: user.full_name }
      setVendor(nextVendor)
      setProfileForm({
        business_name: nextVendor.business_name || nextVendor.company_name || '',
        owner_name: nextVendor.owner_name || user.full_name || '',
        business_description: nextVendor.business_description || nextVendor.description || '',
        business_type: nextVendor.business_type || '',
        registration_number: nextVendor.registration_number || '',
        gst_number: nextVendor.gst_number || '',
        business_phone: nextVendor.business_phone || nextVendor.phone_business || user.phone || '',
        business_email: nextVendor.business_email || user.email || '',
        business_address: nextVendor.business_address || nextVendor.location || '',
        city: nextVendor.city || '',
        state: nextVendor.state || nextVendor.state_of_operation?.[0] || '',
        pincode: nextVendor.pincode || '',
        website_url: nextVendor.website_url || '',
        years_in_business: nextVendor.years_in_business ? String(nextVendor.years_in_business) : '',
        service_areas: Array.isArray(nextVendor.service_areas) ? nextVendor.service_areas.join(', ') : '',
        support_contact: nextVendor.support_contact || '',
      })

      const { data: productData } = await supabase
        .from('products')
        .select('*, vendor:vendors(*)')
        .eq('vendor_id', nextVendor.id)
        .order('created_at', { ascending: false })

      setProducts((productData || []).map(normalizeProduct))

      const { data: articleData } = await supabase
        .from('articles')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      setArticles(articleData || [])
    } catch (err: any) {
      setError(sanitizeError(err, 'Failed to load vendor dashboard'))
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const activeProducts = products.filter((product) => product.stock_quantity > 0).length
    const inventoryValue = products.reduce(
      (sum, product) => sum + Number(product.price || 0) * Number(product.stock_quantity || 0),
      0
    )

    return {
      products: products.length,
      activeProducts,
      articles: articles.length,
      inventoryValue,
    }
  }, [products, articles])

  const showMessage = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    setError('')

    const richPayload = {
      id: vendorId,
      user_id: user.id,
      company_name: profileForm.business_name,
      business_name: profileForm.business_name,
      owner_name: profileForm.owner_name,
      description: profileForm.business_description,
      business_description: profileForm.business_description,
      business_type: profileForm.business_type,
      registration_number: profileForm.registration_number,
      gst_number: profileForm.gst_number,
      phone_business: profileForm.business_phone,
      business_phone: profileForm.business_phone,
      business_email: profileForm.business_email,
      location: profileForm.business_address,
      business_address: profileForm.business_address,
      city: profileForm.city,
      state: profileForm.state,
      pincode: profileForm.pincode,
      website_url: profileForm.website_url,
      years_in_business: profileForm.years_in_business ? Number(profileForm.years_in_business) : null,
      service_areas: profileForm.service_areas
        .split(',')
        .map((area) => area.trim())
        .filter(Boolean),
      support_contact: profileForm.support_contact,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    try {
      const { data, error: richError } = await supabase
        .from('vendors')
        .upsert([richPayload])
        .select()
        .single()

      if (richError) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('vendors')
          .upsert([
            {
              id: vendorId,
              company_name: profileForm.business_name,
              location: profileForm.business_address,
              phone_business: profileForm.business_phone,
              description: profileForm.business_description,
            },
          ])
          .select()
          .single()

        if (fallbackError) throw fallbackError
        setVendor(fallbackData)
      } else {
        setVendor(data)
      }

      await supabase.from('users').update({ full_name: profileForm.owner_name, phone: profileForm.business_phone }).eq('id', user.id)
      await supabase
        .from('profiles')
        .update({
          full_name: profileForm.owner_name,
          phone: profileForm.business_phone,
          location: profileForm.business_address,
          bio: profileForm.business_description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      showMessage('Vendor profile saved')
    } catch (err: any) {
      setError(sanitizeError(err, 'Failed to save vendor profile'))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateProduct = async (event: FormEvent) => {
    event.preventDefault()
    if (!vendorId) return
    setSaving(true)
    setError('')

    try {
      const { error: productError } = await supabase.from('products').insert([
        {
          vendor_id: vendorId,
          name: productForm.name,
          description: productForm.description,
          category: productForm.category,
          price: Number(productForm.price),
          stock_quantity: Number(productForm.stock_quantity),
          image: productForm.image || null,
        },
      ])

      if (productError) throw productError

      setProductForm({
        name: '',
        description: '',
        category: 'Seeds',
        price: '',
        stock_quantity: '',
        image: '',
      })
      showMessage('Product created')
      await loadDashboard()
      setActiveTab('products')
    } catch (err: any) {
      setError(sanitizeError(err, 'Failed to create product'))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateArticle = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')

    try {
      const slug = `${slugify(articleForm.title)}-${Date.now().toString(36)}`
      const { error: articleError } = await supabase.from('articles').insert([
        {
          title: articleForm.title,
          slug,
          description: articleForm.description,
          content: articleForm.content,
          featured_image_url: articleForm.featured_image_url || null,
          category: articleForm.category,
          tags: ['vendor'],
          relevant_crops: ['All'],
          relevant_states: ['All'],
          author_id: user.id,
          author_name: profileForm.business_name || user.full_name || 'Vendor',
          is_published: true,
          published_at: new Date().toISOString(),
        },
      ])

      if (articleError) throw articleError

      setArticleForm({
        title: '',
        description: '',
        content: '',
        category: 'market',
        featured_image_url: '',
      })
      showMessage('News article published')
      await loadDashboard()
      setActiveTab('news')
    } catch (err: any) {
      setError(sanitizeError(err, 'Failed to create news article'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: FiBarChart2 },
    { id: 'products' as TabType, label: 'Products', icon: FiPackage },
    { id: 'news' as TabType, label: 'News', icon: FiFileText },
    { id: 'profile' as TabType, label: 'Business Profile', icon: FiBriefcase },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-green-700">Vendor workspace</p>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {profileForm.business_name || 'Vendor Dashboard'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your storefront, product inventory, and vendor news.</p>
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700"
          >
            <FiPlus size={16} />
            Add Product
          </button>
        </div>

        {(message || error) && (
          <div className={`mb-6 px-4 py-3 rounded-lg border text-sm ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {error || message}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Stat label="Total Products" value={stats.products.toString()} />
              <Stat label="In Stock Products" value={stats.activeProducts.toString()} />
              <Stat label="Published News" value={stats.articles.toString()} />
              <Stat label="Inventory Value" value={`Rs ${stats.inventoryValue.toLocaleString('en-IN')}`} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <List title="Recent Products" empty="No products yet">
                {products.slice(0, 5).map((product) => (
                  <Row key={product.id} left={product.name} right={`Rs ${Number(product.price).toLocaleString('en-IN')}`} />
                ))}
              </List>
              <List title="Recent News" empty="No news articles yet">
                {articles.slice(0, 5).map((article) => (
                  <Row key={article.id} left={article.title} right={article.category || 'general'} />
                ))}
              </List>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid lg:grid-cols-[420px_1fr] gap-6">
            <form onSubmit={handleCreateProduct} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4 h-fit">
              <h2 className="font-bold text-gray-900">Create Product</h2>
              <Input label="Product Name" value={productForm.name} onChange={(value) => setProductForm({ ...productForm, name: value })} required />
              <Textarea label="Description" value={productForm.description} onChange={(value) => setProductForm({ ...productForm, description: value })} required />
              <Select
                label="Category"
                value={productForm.category}
                onChange={(value) => setProductForm({ ...productForm, category: value })}
                options={['Seeds', 'Fertilizers', 'Pesticides', 'Equipment', 'Machinery', 'Tools', 'Irrigation', 'Organic Products']}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Price" type="number" value={productForm.price} onChange={(value) => setProductForm({ ...productForm, price: value })} required />
                <Input label="Stock" type="number" value={productForm.stock_quantity} onChange={(value) => setProductForm({ ...productForm, stock_quantity: value })} required />
              </div>
              <Input label="Image URL" value={productForm.image} onChange={(value) => setProductForm({ ...productForm, image: value })} />
              <SubmitButton saving={saving} label="Create Product" />
            </form>

            <List title="Your Products" empty="No products yet">
              {products.map((product) => (
                <Row
                  key={product.id}
                  left={`${product.name} (${product.stock_quantity} in stock)`}
                  right={`Rs ${Number(product.price).toLocaleString('en-IN')}`}
                />
              ))}
            </List>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="grid lg:grid-cols-[420px_1fr] gap-6">
            <form onSubmit={handleCreateArticle} className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4 h-fit">
              <h2 className="font-bold text-gray-900">Create News</h2>
              <Input label="Title" value={articleForm.title} onChange={(value) => setArticleForm({ ...articleForm, title: value })} required />
              <Textarea label="Short Description" value={articleForm.description} onChange={(value) => setArticleForm({ ...articleForm, description: value })} required />
              <Textarea label="Article Content" value={articleForm.content} rows={6} onChange={(value) => setArticleForm({ ...articleForm, content: value })} required />
              <Select
                label="Category"
                value={articleForm.category}
                onChange={(value) => setArticleForm({ ...articleForm, category: value })}
                options={['market', 'weather', 'pest', 'government', 'general']}
              />
              <Input label="Featured Image URL" value={articleForm.featured_image_url} onChange={(value) => setArticleForm({ ...articleForm, featured_image_url: value })} />
              <SubmitButton saving={saving} label="Publish News" />
            </form>

            <List title="Your News" empty="No news articles yet">
              {articles.map((article) => (
                <Row key={article.id} left={article.title} right={article.is_published ? 'Published' : 'Draft'} />
              ))}
            </List>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Detailed Business Profile</h2>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                <FiSave size={16} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Business Name" value={profileForm.business_name} onChange={(value) => setProfileForm({ ...profileForm, business_name: value })} />
              <Input label="Owner Name" value={profileForm.owner_name} onChange={(value) => setProfileForm({ ...profileForm, owner_name: value })} />
              <Input label="Business Type" value={profileForm.business_type} onChange={(value) => setProfileForm({ ...profileForm, business_type: value })} />
              <Input label="Registration Number" value={profileForm.registration_number} onChange={(value) => setProfileForm({ ...profileForm, registration_number: value })} />
              <Input label="GST Number" value={profileForm.gst_number} onChange={(value) => setProfileForm({ ...profileForm, gst_number: value })} />
              <Input label="Years in Business" type="number" value={profileForm.years_in_business} onChange={(value) => setProfileForm({ ...profileForm, years_in_business: value })} />
              <Input label="Business Phone" value={profileForm.business_phone} onChange={(value) => setProfileForm({ ...profileForm, business_phone: value })} />
              <Input label="Business Email" type="email" value={profileForm.business_email} onChange={(value) => setProfileForm({ ...profileForm, business_email: value })} />
              <Input label="City" value={profileForm.city} onChange={(value) => setProfileForm({ ...profileForm, city: value })} />
              <Input label="State" value={profileForm.state} onChange={(value) => setProfileForm({ ...profileForm, state: value })} />
              <Input label="Pincode" value={profileForm.pincode} onChange={(value) => setProfileForm({ ...profileForm, pincode: value })} />
              <Input label="Website URL" value={profileForm.website_url} onChange={(value) => setProfileForm({ ...profileForm, website_url: value })} />
              <Input label="Service Areas" value={profileForm.service_areas} onChange={(value) => setProfileForm({ ...profileForm, service_areas: value })} />
              <Input label="Support Contact" value={profileForm.support_contact} onChange={(value) => setProfileForm({ ...profileForm, support_contact: value })} />
              <div className="md:col-span-2">
                <Textarea label="Business Address" value={profileForm.business_address} onChange={(value) => setProfileForm({ ...profileForm, business_address: value })} />
              </div>
              <div className="md:col-span-2">
                <Textarea label="Business Description" rows={4} value={profileForm.business_description} onChange={(value) => setProfileForm({ ...profileForm, business_description: value })} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  )
}

function List({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-4">{title}</h2>
      <div className="divide-y divide-gray-100">
        {hasItems ? children : <p className="text-sm text-gray-500 py-6 text-center">{empty}</p>}
      </div>
    </div>
  )
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="font-medium text-gray-800 truncate">{left}</span>
      <span className="text-gray-500 shrink-0">{right}</span>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="input-modern"
      />
    </label>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        className="input-modern resize-none"
      />
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input-modern">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
    >
      <FiSave size={16} />
      {saving ? 'Saving...' : label}
    </button>
  )
}
