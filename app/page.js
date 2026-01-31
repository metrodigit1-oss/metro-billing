'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ToWords } from 'to-words';
import { useAuth } from '../components/AuthProvider'

export default function InvoicePage() {

  const { role } = useAuth()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const router = useRouter()
  
  // 1. UPDATED MODE SELECTION
  const [invoiceType, setInvoiceType] = useState('SALE') 
  // Options: 'SALE', 'PURCHASE', 'RAW_MATERIALS', 'MACHINE_MAINTENANCE'
  const [paymentMode, setPaymentMode] = useState('CREDIT')

  const [invoiceDate, setInvoiceDate] = useState('')
  useEffect(() => {
    setInvoiceDate(new Date().toISOString().split('T')[0])
  }, [])

  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [rows, setRows] = useState([
    { description: '', hsn: '', qty: 1, rate: 0, amount: 0 }
  ])
  const [showCustForm, setShowCustForm] = useState(false)
  const [newCust, setNewCust] = useState({ name: '', address: '', gstin: '', phone: '' })

  const [showProdForm, setShowProdForm] = useState(false)
  const [newProd, setNewProd] = useState({ name: '', hsn: '', rate: 0, unit: 'NOS', gst: 18 })
  
  const [totals, setTotals] = useState({ taxable: 0, tax: 0, grand: 0 })
  const [isGstBill, setIsGstBill] = useState(false)

  const [invoiceNo, setInvoiceNo] = useState('') 
  const [refNo, setRefNo] = useState('') 
  const [isSaving, setIsSaving] = useState(false)

  const searchParams = useSearchParams()
  const editId = searchParams.get('id') 
  const returnMonth = searchParams.get('returnMonth') // Catch the return month param

  // --- LOAD DATA ---
  useEffect(() => {
    async function loadData() {
      const { data: custData } = await supabase.from('customers').select('*')
      const { data: prodData } = await supabase.from('products').select('*')
      if (custData) setCustomers(custData)
      if (prodData) setProducts(prodData)
    }
    loadData()
  }, [])

  // --- EDIT MODE ---
  useEffect(() => {
    if (editId) loadInvoiceForEdit(editId)
  }, [editId])

  async function loadInvoiceForEdit(id) {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
    if (inv) {
      setInvoiceNo(inv.invoice_number)
      setRefNo(inv.reference_number || '')
      setInvoiceDate(inv.invoice_date)
      setPaymentMode(inv.payment_mode || 'CREDIT')
      setSelectedCustomer(inv.customer_id)
      setIsGstBill(inv.is_gst_bill !== false)
      setInvoiceType(inv.invoice_type || 'SALE') // Load type
      
      
      const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', id)
      
      const formattedRows = items.map(item => ({
        description: item.description,
        subheading: item.subheading || '', 
        hsn: item.hsn_sac_code,
        qty: item.quantity_billed,
        rate: item.rate,
        unit: item.unit || 'NOS',
        amount: item.taxable_value
      }))
      setRows(formattedRows)
    }
  }

  // --- CALCULATIONS ---
  useEffect(() => {
    let taxable = 0
    rows.forEach(row => {
      taxable += (row.qty * row.rate)
    })
    const taxAmount = taxable * 0.18 
    setTotals({ taxable: taxable, tax: taxAmount, grand: taxable + taxAmount })
  }, [rows])

  // --- HANDLERS ---
  const handleRowChange = (index, field, value) => {
    const newRows = [...rows]
    newRows[index][field] = value
    
    if (field === 'qty' || field === 'rate') {
      const q = parseFloat(newRows[index].qty) || 0
      const r = parseFloat(newRows[index].rate) || 0
      newRows[index].amount = q * r
    }
    
    if (field === 'description') {
       const product = products.find(p => p.item_name === value)
       if (product) {
         newRows[index].hsn = product.hsn_sac_code
         newRows[index].rate = product.default_rate
         newRows[index].unit = product.unit || 'NOS'
         newRows[index].amount = 1 * product.default_rate
       }
    }
    setRows(newRows)
  }

  const addRow = () => {
    setRows([...rows, { description: '', subheading: '', hsn: '', qty: 1, rate: 0, amount: 0 }])
  }

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index))
    }
  }

  // --- BACK NAVIGATION ---
  const handleBack = () => {
    if (returnMonth) {
        router.push(`/history?month=${returnMonth}`)
    } else {
        router.push('/history')
    }
  }

  // --- SAVE ---
  async function saveInvoice() {
    const isSales = invoiceType === 'SALE';
    if (!selectedCustomer) return alert(isSales ? 'Select a Customer' : 'Select a Supplier/Client')
    if (rows.length === 0) return alert('Add at least one item')

    setIsSaving(true)
    let currentInvoiceId = editId

    const totalTaxable = rows.reduce((sum, row) => sum + row.amount, 0)
    const totalCGST = isGstBill ? totalTaxable * 0.09 : 0
    const totalSGST = isGstBill ? totalTaxable * 0.09 : 0
    const grandTotal = totalTaxable + totalCGST + totalSGST
    
    const invoiceData = {
      customer_id: selectedCustomer,
      invoice_number: invoiceNo,
      reference_number: refNo,
      invoice_date: invoiceDate,
      total_taxable_value: totalTaxable,
      total_cgst_amount: totalCGST,
      total_sgst_amount: totalSGST,
      grand_total: grandTotal,
      is_gst_bill: isGstBill,
      invoice_type: invoiceType, // Saves specific type
      payment_mode: paymentMode
    }

    if (editId) {
      const { error } = await supabase.from('invoices').update(invoiceData).eq('id', editId)
      if (error) { alert('Error updating: ' + error.message); setIsSaving(false); return; }
      await supabase.from('invoice_items').delete().eq('invoice_id', editId)
    } else {
      const { data, error } = await supabase.from('invoices').insert([invoiceData]).select()
      if (error) { alert('Error saving: ' + error.message); setIsSaving(false); return; }
      currentInvoiceId = data[0].id
    }

    const itemsToSave = rows.map(row => ({
      invoice_id: currentInvoiceId,
      description: row.description,
      subheading: row.subheading,
      hsn_sac_code: row.hsn,
      quantity_billed: row.qty,
      quantity_shipped: row.qty, 
      rate: row.rate,
      unit: row.unit || 'NOS',
      taxable_value: row.amount,
      cgst_amount: row.amount * 0.09,
      sgst_amount: row.amount * 0.09,
      cgst_rate: 9,
      sgst_rate: 9
    }))

    const { error: itemError } = await supabase.from('invoice_items').insert(itemsToSave)

    if (itemError) alert('Error saving items: ' + itemError.message)
    else {
        // If we are editing and came from history, return to that history page on save
        // Otherwise go to print
        if (editId && returnMonth) {
            router.push(`/history?month=${returnMonth}`)
        } else {
            router.push(`/print/${currentInvoiceId}`)
        }
    }
    
    setIsSaving(false)
  }

  // --- SAVE NEW CUSTOMER ---
  async function saveNewCustomer() {
    if (!newCust.name) return alert('Enter Name')
    const { data, error } = await supabase.from('customers').insert([{
      company_name: newCust.name,
      address: newCust.address,
      gstin: newCust.gstin,
      phone: newCust.phone,
      state: 'Kerala', state_code: 32, place_of_supply: 'Kerala'
    }]).select()

    if (error) alert('Error: ' + error.message)
    else {
      setCustomers([...customers, data[0]])
      setSelectedCustomer(data[0].id)
      setShowCustForm(false)
      setNewCust({ name: '', address: '', gstin: '', phone: '' })
    }
  }

  // --- SAVE NEW PRODUCT ---
  async function saveNewProduct() {
    if (!newProd.name) return alert('Enter Item Name')
    const { data, error } = await supabase.from('products').insert([{
      item_name: newProd.name,
      hsn_sac_code: newProd.hsn,
      default_rate: newProd.rate,
      unit: newProd.unit,          
      gst_rate: newProd.gst
    }]).select()

    if (error) alert('Error: ' + error.message)
    else {
      setProducts([...products, data[0]])
      setShowProdForm(false)
      setNewProd({ name: '', hsn: '', rate: 0, unit: 'NOS', gst: 18 })
    }
  }

  // Styles
  const getTabStyle = (type) => ({
    padding: '10px 15px', 
    background: invoiceType === type ? '#333' : '#e2e6ea', 
    color: invoiceType === type ? 'white' : '#333', 
    border: 'none', 
    cursor: 'pointer', 
    fontWeight: invoiceType === type ? 'bold' : 'normal',
    borderRadius: '4px',
    fontSize: '13px'
  })

  // Helper to check if current mode is a "Purchase" type category
  const isBuyingMode = invoiceType !== 'SALE';

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* TALLY STYLE HEADER BUTTONS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px', background: '#f8f9fa', padding: '10px', borderRadius: '5px', gap: '8px' }}>
        <button onClick={() => setInvoiceType('SALE')} style={getTabStyle('SALE')}>SALE</button>
        <button onClick={() => setInvoiceType('PURCHASE')} style={getTabStyle('PURCHASE')}>PURCHASE</button>
        <button onClick={() => setInvoiceType('RAW_MATERIALS')} style={getTabStyle('RAW_MATERIALS')}>RAW MATERIALS</button>
        <button onClick={() => setInvoiceType('MACHINE_MAINTENANCE')} style={getTabStyle('MACHINE_MAINTENANCE')}>MACHINE MAINT.</button>
      </div>

      {/* SUB HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>METRO DIGITAL PRINTING</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Ernakulam, Kerala</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <Link href="/history"><button style={{ fontSize: '12px', padding: '5px' }}>📂 View Past Invoices</button></Link>
            <Link href="/manage"><button style={{ fontSize: '12px', padding: '5px' }}>⚙️ Manage Data</button></Link>
            {role === 'admin' && <Link href="/admin/users"><button style={{ fontSize: '12px', padding: '5px' }}>👑 Admin</button></Link>}
            <Link href="/profile"><button style={{ fontSize: '12px', padding: '5px' }}>👤 Profile</button></Link>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            {/* BACK BUTTON APPEARS ONLY WHEN EDITING */}
            {editId && (
                <button 
                    onClick={handleBack}
                    style={{ background: '#666', color: 'white', padding: '5px 10px', fontSize: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                >
                    &larr; Back
                </button>
            )}
            <h1 style={{ margin: 0, color: invoiceType === 'SALE' ? '#28a745' : '#dc3545', fontSize: '24px' }}>
                {invoiceType.replace('_', ' ')}
            </h1>
          </div>
          <select 
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            style={{ padding: '5px', marginTop: '5px', display: 'block', width: '100%', textAlign: 'right', fontWeight: 'bold' }}
          >
            <option value="CREDIT">CREDIT</option>
            <option value="CASH">CASH</option>
            <option value="BANK">BANK TRANSFER</option>
          </select>
          <input 
            type="text" 
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="Invoice No"
            style={{ padding: '5px', marginTop: '5px', textAlign: 'right', display: 'block', width: '100%' }}
          />
          <input 
            type="text" 
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            placeholder="Ref No"
            style={{ padding: '5px', marginTop: '5px', textAlign: 'right', display: 'block', width: '100%' }}
          />
          <input 
            type="date" 
            value={invoiceDate} 
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={{ padding: '5px', marginTop: '5px' }}
          />
        </div>
      </div>

      {/* CUSTOMER/CLIENT SELECTION */}
      <div style={{ marginBottom: '20px', background: isBuyingMode ? '#fff0f0' : '#f9f9f9', padding: '15px', borderRadius: '5px', border: isBuyingMode ? '1px solid #ffdcdc' : '1px solid #eee' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
           <label style={{ fontWeight: 'bold' }}>
             {isBuyingMode ? 'Purchase From / Service Provider:' : 'Bill To (Customer):'}
           </label>
           <button 
             onClick={() => setShowCustForm(!showCustForm)}
             style={{ background: '#007bff', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '12px' }}
           >
             {showCustForm ? '- Cancel' : '+ New Party'}
           </button>
        </div>

        <select 
          style={{ width: '100%', padding: '8px', fontSize: '14px', marginBottom: '10px' }}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          value={selectedCustomer}
        >
          <option value="">-- Select Party --</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>

        {showCustForm && (
          <div style={{ background: '#e9ecef', padding: '10px', border: '1px solid #ccc', marginTop: '5px' }}>
            <input placeholder="Company/Client Name" style={{ width: '100%', padding: '5px', marginBottom: '5px' }} 
              value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
            <textarea placeholder="Address" style={{ width: '100%', padding: '5px', marginBottom: '5px', height: '60px' }} 
              value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} />
            <div style={{ display: 'flex', gap: '5px' }}>
              <input placeholder="GSTIN" style={{ flex: 1, padding: '5px' }} 
                value={newCust.gstin} onChange={e => setNewCust({...newCust, gstin: e.target.value})} />
              <input placeholder="Phone" style={{ flex: 1, padding: '5px' }} 
                value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} />
            </div>
            <button onClick={saveNewCustomer} style={{ marginTop: '10px', width: '100%', background: '#28a745', color: 'white', padding: '8px', border: 'none', cursor: 'pointer' }}>
              Save Party
            </button>
          </div>
        )}
      </div>

      {/* THE GRID */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#333', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Description of Goods / Services</th>
            <th style={{ padding: '10px', width: '100px' }}>HSN/SAC</th>
            <th style={{ padding: '10px', width: '80px' }}>Qty</th>
            <th style={{ padding: '10px', width: '100px' }}>Rate</th>
            <th style={{ padding: '10px', width: '120px', textAlign: 'right' }}>Amount</th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ border: '1px solid #ccc', padding: '5px' }}>
                <input 
                  list="products" 
                  value={row.description}
                  onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                  placeholder="Type item name..."
                  style={{ width: '100%', padding: '5px', border: 'none' }}
                />
                <input 
                    type="text" 
                    value={row.subheading || ''}
                    onChange={(e) => handleRowChange(index, 'subheading', e.target.value)}
                    placeholder="Subheading..."
                    style={{ width: '100%', padding: '5px', marginTop: '2px', fontSize: '11px', fontStyle: 'italic', borderTop: 'none' }}
                  />
                <datalist id="products">
                  {products.map(p => <option key={p.id} value={p.item_name} />)}
                </datalist>
              </td>
              <td><input value={row.hsn} onChange={(e) => handleRowChange(index, 'hsn', e.target.value)} style={{ width: '100%', padding: '5px', border: 'none' }} /></td>
              <td><input type="number" value={row.qty} onChange={(e) => handleRowChange(index, 'qty', e.target.value)} style={{ width: '100%', padding: '5px', border: 'none' }} /></td>
              <td><input type="number" value={row.rate} onChange={(e) => handleRowChange(index, 'rate', e.target.value)} style={{ width: '100%', padding: '5px', border: 'none' }} /></td>
              <td style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 'bold' }}>{row.amount.toFixed(2)}</td>
              <td style={{ textAlign: 'center' }}>
                <button onClick={() => removeRow(index)} style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PRODUCT CREATION */}
      <div style={{ textAlign: 'right', marginBottom: '5px' }}>
         <button onClick={() => setShowProdForm(!showProdForm)} style={{ background: '#666', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '12px' }}>
           {showProdForm ? '- Cancel' : '+ Create New Product'}
         </button>
      </div>
      {showProdForm && (
        <div style={{ background: '#fff3cd', padding: '10px', border: '1px solid #ffeeba', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
             <input placeholder="Item Name" style={{ flex: 2, padding: '5px' }} value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} />
             <input placeholder="HSN Code" style={{ flex: 1, padding: '5px' }} value={newProd.hsn} onChange={e => setNewProd({...newProd, hsn: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <input type="number" placeholder="Rate" style={{ flex: 1, padding: '5px' }} value={newProd.rate} onChange={e => setNewProd({...newProd, rate: e.target.value})} />
             <select style={{ flex: 1, padding: '5px' }} value={newProd.unit} onChange={e => setNewProd({...newProd, unit: e.target.value})}>
                <option value="NOS">NOS</option><option value="Sheet">Sheet</option>
             </select>
             <input type="number" placeholder="GST %" style={{ flex: 1, padding: '5px' }} value={newProd.gst} onChange={e => setNewProd({...newProd, gst: e.target.value})} />
             <button onClick={saveNewProduct} style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px 15px', cursor: 'pointer' }}>Add</button>
          </div>
        </div>
      )}

      {/* GST TOGGLE */}
      <div style={{ marginBottom: '10px', padding: '10px', background: '#e2e6ea', borderRadius: '4px' }}>
        <label style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <input type="checkbox" checked={isGstBill} onChange={(e) => setIsGstBill(e.target.checked)} style={{ width: '20px', height: '20px', marginRight: '10px' }} />
          Generate GST Invoice
        </label>
      </div>

      <button onClick={addRow} style={{ background: '#eee', border: '1px dashed #999', width: '100%', padding: '10px', cursor: 'pointer' }}>+ Add Line Item</button>

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <div style={{ width: '300px', textAlign: 'right' }}>
          <div style={{ padding: '5px', borderBottom: '1px solid #eee' }}>Taxable Value: <strong>{totals.taxable.toFixed(2)}</strong></div>
          <div style={{ padding: '5px', borderBottom: '1px solid #eee' }}>Total Tax (18%): <strong>{totals.tax.toFixed(2)}</strong></div>
          <div style={{ padding: '10px', fontSize: '18px', background: '#f0f0f0', marginTop: '10px' }}>Grand Total: <strong>₹ {totals.grand.toFixed(2)}</strong></div>
        </div>
      </div>
      <div style={{ marginTop: '30px', borderTop: '2px solid #333', paddingTop: '20px', textAlign: 'right' }}>
        <button onClick={saveInvoice} disabled={isSaving} style={{ background: isSaving ? '#ccc' : '#28a745', color: 'white', padding: '15px 40px', fontSize: '18px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {editId ? 'Save Update' : 'Save & Print'}
        </button>
      </div>
    </div>
  )
}