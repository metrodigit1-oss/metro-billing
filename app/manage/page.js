'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ManagePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('products') // 'products' or 'customers'
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    fetchData()
  }, [activeTab])

  async function fetchData() {
    const table = activeTab === 'products' ? 'products' : 'customers'
    const { data, error } = await supabase.from(table).select('*').order('id')
    if (data) setItems(data)
  }

  // --- DELETE ---
  async function handleDelete(id) {
    if (!confirm('Are you sure? This cannot be undone.')) return
    
    const table = activeTab === 'products' ? 'products' : 'customers'
    const { error } = await supabase.from(table).delete().eq('id', id)

    if (error) alert('Error deleting: ' + error.message)
    else fetchData()
  }

  // --- EDIT ---
  function startEdit(item) {
    setEditingId(item.id)
    setFormData(item)
  }

  async function saveEdit() {
    const table = activeTab === 'products' ? 'products' : 'customers'
    const { id, created_at, ...updates } = formData

    const { error } = await supabase.from(table).update(updates).eq('id', editingId)

    if (error) alert('Error updating: ' + error.message)
    else {
      setEditingId(null)
      fetchData()
    }
  }

  // Common input style to make them fit cell width
  const inputStyle = { width: '100%', padding: '5px', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>⚙️ Manage Data</h1>
        <Link href="/">
           <button style={{ padding: '10px', cursor: 'pointer' }}>&larr; Back to Invoice</button>
        </Link>
      </div>

      {/* TABS */}
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
        <button 
          onClick={() => { setActiveTab('products'); setEditingId(null); }}
          style={{ padding: '10px 20px', marginRight: '5px', cursor: 'pointer', background: activeTab === 'products' ? '#333' : '#eee', color: activeTab === 'products' ? 'white' : 'black', border: 'none' }}
        >
          Products
        </button>
        <button 
          onClick={() => { setActiveTab('customers'); setEditingId(null); }}
          style={{ padding: '10px 20px', cursor: 'pointer', background: activeTab === 'customers' ? '#333' : '#eee', color: activeTab === 'customers' ? 'white' : 'black', border: 'none' }}
        >
          Customers
        </button>
      </div>

      {/* TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
            <th style={{ padding: '10px', width: '50px' }}>ID</th>
            {activeTab === 'products' ? (
              <>
                <th style={{ padding: '10px' }}>Item Name</th>
                <th style={{ padding: '10px', width: '120px' }}>HSN</th>
                <th style={{ padding: '10px', width: '100px' }}>Rate</th>
                <th style={{ padding: '10px', width: '80px' }}>Unit</th>
                <th style={{ padding: '10px', width: '80px' }}>GST %</th>
              </>
            ) : (
              <>
                <th style={{ padding: '10px' }}>Company Name</th>
                <th style={{ padding: '10px' }}>Address</th>
                <th style={{ padding: '10px', width: '120px' }}>Phone</th>
                <th style={{ padding: '10px', width: '150px' }}>GSTIN</th>
              </>
            )}
            <th style={{ textAlign: 'center', width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const isEditing = editingId === item.id;
            
            return (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee', background: isEditing ? '#fff3cd' : 'transparent' }}>
              
              {/* ID COLUMN (Never Editable) */}
              <td style={{ padding: '10px' }}>{item.id}</td>

              {/* DYNAMIC COLUMNS */}
              {activeTab === 'products' ? (
                <>
                  {/* Name */}
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input style={inputStyle} value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} /> : item.item_name}
                  </td>
                  {/* HSN */}
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input style={inputStyle} value={formData.hsn_sac_code} onChange={e => setFormData({...formData, hsn_sac_code: e.target.value})} /> : item.hsn_sac_code}
                  </td>
                  {/* Rate */}
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input type="number" style={inputStyle} value={formData.default_rate} onChange={e => setFormData({...formData, default_rate: e.target.value})} /> : item.default_rate}
                  </td>
                  {/* Unit */}
                  <td style={{ padding: '5px' }}>
                    {isEditing ? (
                        <select style={inputStyle} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                            <option value="NOS">NOS</option><option value="SQFT">SQFT</option><option value="KG">KG</option><option value="MTR">MTR</option>
                        </select>
                    ) : item.unit}
                  </td>
                  {/* GST (Assuming you added this column, if not, remove this td block) */}
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input type="number" style={inputStyle} value={formData.gst_rate} onChange={e => setFormData({...formData, gst_rate: e.target.value})} /> : (item.gst_rate || 18)}
                  </td>
                </>
              ) : (
                // CUSTOMER COLUMNS
                <>
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input style={inputStyle} value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} /> : item.company_name}
                  </td>
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input style={inputStyle} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /> : <span style={{fontSize: '11px'}}>{item.address?.substring(0, 30)}...</span>}
                  </td>
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input style={inputStyle} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /> : item.phone}
                  </td>
                  <td style={{ padding: '5px' }}>
                    {isEditing ? <input style={inputStyle} value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} /> : item.gstin}
                  </td>
                </>
              )}

              {/* ACTION COLUMN */}
              <td style={{ textAlign: 'center', padding: '10px' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    <button onClick={saveEdit} style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', borderRadius: '3px' }}>Save</button>
                    <button onClick={() => setEditingId(null)} style={{ background: '#666', color: 'white', border: 'none', padding: '5px', cursor: 'pointer', borderRadius: '3px' }}>X</button>
                  </div>
                ) : (
                  <div>
                    <button onClick={() => startEdit(item)} style={{ marginRight: '10px', cursor: 'pointer', border: 'none', background: 'transparent' }}>✏️</button>
                    <button onClick={() => handleDelete(item.id)} style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: 'red' }}>🗑️</button>
                  </div>
                )}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  )
}