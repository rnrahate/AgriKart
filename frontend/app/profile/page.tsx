'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { sanitizeError } from '@/lib/errorUtils'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiSettings, 
  FiLogOut, FiSave, FiCheck, FiAlertCircle, FiEdit3, 
  FiBriefcase, FiShield, FiCompass, FiSliders 
} from 'react-icons/fi'

type TabType = 'profile' | 'farm' | 'vendor' | 'settings' | 'security'

export default function ProfilePage() {
  const { user, loading: authLoading, logout, openUserProfile, isClerk } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // 1. Personal & General Info
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState<'farmer' | 'vendor' | 'expert' | 'admin'>('farmer')

  // 2. Extra Farmer / Agricultural Details
  const [landSize, setLandSize] = useState('')
  const [primaryCrops, setPrimaryCrops] = useState('')
  const [farmType, setFarmType] = useState('Crop Farming')

  // 3. Extra Vendor / Business Details
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('Agriculture Retailer')
  const [gstNumber, setGstNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')

  // 4. Preferences & Notifications
  const [language, setLanguage] = useState('en')
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    schemeAlerts: true,
    diseaseAlerts: true,
    orderUpdates: true,
  })

  // 5. Password fields (for direct/supabase mode)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/profile')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const tab = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tab')
      : null
    if (tab === 'settings' || tab === 'security' || tab === 'vendor' || tab === 'farm' || tab === 'role') {
      if (tab === 'role') {
        setActiveTab('vendor')
      } else {
        setActiveTab(tab as TabType)
      }
    }
  }, [])

  // Load existing profile & vendor data from Supabase
  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        setFullName(user.full_name || '')
        setPhone(user.phone || '')
        setLocation(user.location || '')
        setState(user.state || '')
        setBio(user.bio || '')
        setRole(user.role || 'farmer')
        setLanguage(user.language || 'en')

        // Fetch deep profile row from Supabase
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (prof) {
          if (prof.full_name) setFullName(prof.full_name)
          if (prof.phone) setPhone(prof.phone)
          if (prof.location) setLocation(prof.location)
          if (prof.state) setState(prof.state)
          if (prof.bio) setBio(prof.bio)
          if (prof.role) setRole(prof.role)
          if (prof.language) setLanguage(prof.language)
          if (prof.notification_preferences) {
            setNotifications((prev) => ({ ...prev, ...prof.notification_preferences }))
          }
          if (prof.metadata) {
            if (prof.metadata.land_size) setLandSize(prof.metadata.land_size)
            if (prof.metadata.primary_crops) setPrimaryCrops(prof.metadata.primary_crops)
            if (prof.metadata.farm_type) setFarmType(prof.metadata.farm_type)
          }
        }

        // Fetch vendor row if exists
        const { data: vend } = await supabase
          .from('vendors')
          .select('*')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle()

        if (vend) {
          if (vend.business_name || vend.company_name) {
            setBusinessName(vend.business_name || vend.company_name)
          }
          if (vend.business_type) setBusinessType(vend.business_type)
          if (vend.gst_number) setGstNumber(vend.gst_number)
          if (vend.pan_number) setPanNumber(vend.pan_number)
          if (vend.business_phone) setBusinessPhone(vend.business_phone)
          if (vend.business_address) setBusinessAddress(vend.business_address)
          if (vend.city) setCity(vend.city)
          if (vend.pincode) setPincode(vend.pincode)
          if (vend.years_in_business) setYearsInBusiness(String(vend.years_in_business))
        }
      } catch (err) {
        console.warn('[AgriKart Profile Fetch]:', err)
      }
    }

    loadData()
  }, [user])

  const handleSaveAll = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          location: location || null,
          state: state || null,
          bio: bio || null,
          role: role,
          language: language,
          notification_preferences: notifications,
          metadata: {
            land_size: landSize,
            primary_crops: primaryCrops,
            farm_type: farmType,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. If role is vendor, upsert into vendors table
      if (role === 'vendor' || businessName) {
        const { error: vendorError } = await supabase
          .from('vendors')
          .upsert({
            id: user.id,
            user_id: user.id,
            company_name: businessName || fullName || 'AgriKart Vendor Store',
            business_name: businessName || fullName || 'AgriKart Vendor Store',
            owner_name: fullName || 'Vendor Owner',
            business_description: bio || 'Authorized AgriKart Vendor',
            business_type: businessType || 'Agriculture Retailer',
            gst_number: gstNumber || null,
            pan_number: panNumber || null,
            business_phone: businessPhone || phone || null,
            business_email: user.email,
            business_address: businessAddress || location || null,
            city: city || null,
            state: state || null,
            pincode: pincode || null,
            years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : 0,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })

        if (vendorError) throw vendorError
      }

      setSuccess('All profile settings & information saved successfully!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(sanitizeError(err, 'Failed to update profile settings. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(sanitizeError(err, 'Failed to change password. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!user) return null

  const tabs = [
    { id: 'profile' as TabType, label: 'Personal Info', icon: FiUser },
    { id: 'farm' as TabType, label: 'Farm & Land Info', icon: FiCompass },
    { id: 'vendor' as TabType, label: 'Vendor & Business', icon: FiBriefcase },
    { id: 'settings' as TabType, label: 'Preferences & Alerts', icon: FiSliders },
    { id: 'security' as TabType, label: 'Security & Account', icon: FiShield },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 animate-fade-in">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">My Account & Settings</h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage your personal details, farm records, vendor store, preferences, and security.
            </p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-md shadow-green-600/20 w-fit"
          >
            <FiSave size={16} />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit sticky top-24">
            {/* User Badge */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
                {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{fullName || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-[11px] font-semibold capitalize">
                  {role}
                </span>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}

              <div className="border-t border-gray-100 pt-2 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                  <FiLogOut size={16} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            {/* Feedback Notifications */}
            {success && (
              <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                <FiCheck size={18} />
                {success}
              </div>
            )}
            {error && (
              <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                <FiAlertCircle size={18} />
                {error}
              </div>
            )}

            {/* TAB 1: Personal Information */}
            {activeTab === 'profile' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <FiEdit3 size={20} className="text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Personal Information</h2>
                    <p className="text-xs text-gray-500">Your core contact information across AgriKart.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="e.g. Ramesh Kumar"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="input-modern pl-10 bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="input-modern"
                    >
                      <option value="">Select State</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                    </select>
                  </div>

                  {/* Location / Village / City */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City / Village / District</label>
                    <div className="relative">
                      <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="e.g. Nashik, Maharashtra"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio / Overview</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="input-modern resize-none"
                      placeholder="Share a brief overview of your farm or agribusiness..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Farm & Agricultural Info */}
            {activeTab === 'farm' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <FiCompass size={20} className="text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Farm & Agriculture Details</h2>
                    <p className="text-xs text-gray-500">
                      Helps AgriKart calculate scheme eligibility and crop disease predictions accurately.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Land Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Land Size (in Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={landSize}
                      onChange={(e) => setLandSize(e.target.value)}
                      className="input-modern"
                      placeholder="e.g. 5.5"
                    />
                  </div>

                  {/* Farm Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Farming Type</label>
                    <select
                      value={farmType}
                      onChange={(e) => setFarmType(e.target.value)}
                      className="input-modern"
                    >
                      <option value="Crop Farming">Crop Farming</option>
                      <option value="Organic Farming">Organic Farming</option>
                      <option value="Horticulture / Fruits">Horticulture / Fruits</option>
                      <option value="Dairy & Livestock">Dairy & Livestock</option>
                      <option value="Mixed Farming">Mixed Farming</option>
                      <option value="Hydroponics / Greenhouse">Hydroponics / Greenhouse</option>
                    </select>
                  </div>

                  {/* Primary Crops */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Crops Grown</label>
                    <input
                      type="text"
                      value={primaryCrops}
                      onChange={(e) => setPrimaryCrops(e.target.value)}
                      className="input-modern"
                      placeholder="e.g. Wheat, Cotton, Soybeans, Tomatoes, Sugarcane"
                    />
                    <p className="text-xs text-gray-400 mt-1">Separate multiple crops with commas.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Vendor & Business Profile */}
            {activeTab === 'vendor' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <FiBriefcase size={20} className="text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Vendor & Agribusiness Profile</h2>
                    <p className="text-xs text-gray-500">
                      Configure your store to sell fertilizers, seeds, tools, and farming equipment on AgriKart.
                    </p>
                  </div>
                </div>

                {/* Role Switcher */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Current Account Role: {role.toUpperCase()}</p>
                    <p className="text-xs text-emerald-700">
                      Switching to Vendor unlocks product listing, sales dashboard, and order management.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('farmer')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                        role === 'farmer' ? 'bg-green-700 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      🌾 Farmer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('vendor')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                        role === 'vendor' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      🏪 Vendor
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Store / Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Store / Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="input-modern"
                      placeholder="e.g. Kisan Agro Agency"
                    />
                  </div>

                  {/* Business Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Category</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="input-modern"
                    >
                      <option value="Agriculture Retailer">Agriculture Retailer</option>
                      <option value="Fertilizer & Pesticides Distributor">Fertilizer & Pesticides Distributor</option>
                      <option value="Seed Producer & Nursery">Seed Producer & Nursery</option>
                      <option value="Farming Machinery & Tools">Farming Machinery & Tools</option>
                      <option value="Manufacturer">Manufacturer</option>
                    </select>
                  </div>

                  {/* GST Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN / Registration No. (Optional)</label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="input-modern"
                      placeholder="27AAAAA0000A1Z5"
                    />
                  </div>

                  {/* PAN Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">PAN Number (Optional)</label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value)}
                      className="input-modern"
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  {/* Business Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Support & Sales Phone</label>
                    <input
                      type="tel"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      className="input-modern"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  {/* Years in Business */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Years in Business</label>
                    <input
                      type="number"
                      value={yearsInBusiness}
                      onChange={(e) => setYearsInBusiness(e.target.value)}
                      className="input-modern"
                      placeholder="e.g. 5"
                    />
                  </div>

                  {/* Business Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business / Warehouse Address</label>
                    <input
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="input-modern"
                      placeholder="Shop No. 12, APMC Market Yard"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input-modern"
                      placeholder="e.g. Pune"
                    />
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="input-modern"
                      placeholder="411001"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Preferences & Alerts */}
            {activeTab === 'settings' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <FiSliders size={20} className="text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Preferences & Alerts</h2>
                    <p className="text-xs text-gray-500">Configure your notifications and regional options.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="input-modern max-w-sm"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिंदी (Hindi)</option>
                      <option value="mr">मराठी (Marathi)</option>
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                    </select>
                  </div>

                  {/* Notifications */}
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h3 className="text-sm font-bold text-gray-800">Alert Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive scheme and marketplace emails' },
                        { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Critical alerts sent via text messages' },
                        { key: 'schemeAlerts', label: 'Government Scheme Alerts', desc: 'Get notified when new subsidies are announced' },
                        { key: 'diseaseAlerts', label: 'Crop Disease Outbreak Warnings', desc: 'Instant alerts for regional crop infections' },
                        { key: 'orderUpdates', label: 'Order & Shipment Tracking', desc: 'Live updates on purchased supplies' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between cursor-pointer py-1">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{item.label}</p>
                            <p className="text-xs text-gray-400">{item.desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={(notifications as any)[item.key]}
                            onChange={(e) => setNotifications((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Security & Clerk Account */}
            {activeTab === 'security' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                  <FiShield size={20} className="text-green-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Security & Credentials</h2>
                    <p className="text-xs text-gray-500">Manage your passwords, authenticators, and sessions.</p>
                  </div>
                </div>

                {isClerk ? (
                  /* Clerk Account Management */
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20">
                      <FiShield size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Protected by Clerk Security</h3>
                      <p className="text-sm text-gray-600 max-w-md mx-auto mt-1">
                        Your passwords, social logins, two-factor verification, and active sessions are safely managed by Clerk.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openUserProfile?.()}
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all shadow-md active:scale-95"
                    >
                      <FiLock size={16} />
                      Manage Clerk Account & Password
                    </button>
                  </div>
                ) : (
                  /* Supabase Direct Password Change */
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input-modern"
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-modern"
                        placeholder="Repeat new password"
                      />
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                    >
                      <FiLock size={16} />
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
