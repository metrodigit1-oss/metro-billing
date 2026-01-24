'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ToWords } from 'to-words';
import { useAuth } from '../components/AuthProvider'

export default function InvoicePage() {

  const { role } = useAuth()
  // --- 1. STATE MANAGEMENT (The Brains) ---
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const router = useRouter()
  // The Invoice Data
  // 1. Start with an empty date to prevent server mismatches
  const [invoiceDate, setInvoiceDate] = useState('')

  // 2. Set the date only after the browser loads the page
  useEffect(() => {
    setInvoiceDate(new Date().toISOString().split('T')[0])
  }, [])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [rows, setRows] = useState([
    // Start with one empty row
    { description: '', hsn: '', qty: 1, rate: 0, amount: 0 }
  ])
  const [showCustForm, setShowCustForm] = useState(false)
  const [newCust, setNewCust] = useState({ name: '', address: '', gstin: '', phone: '' })

  const [showProdForm, setShowProdForm] = useState(false)
  const [newProd, setNewProd] = useState({ name: '', hsn: '', rate: 0, unit: 'NOS', gst: 18 })
  // Totals
  const [totals, setTotals] = useState({ taxable: 0, tax: 0, grand: 0 })

  const [isGstBill, setIsGstBill] = useState(false)

  const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
      doNotAddOnly: false,
      currencyOptions: {
        name: 'Rupee',
        plural: 'Rupees',
        symbol: '₹',
        fractionalUnit: {
          name: 'Paise',
          plural: 'Paise',
          symbol: '',
        },
      },
    },
  });

  const searchParams = useSearchParams()
  const editId = searchParams.get('id') // Get ID from URL

  // Load Invoice data if we are editing
  useEffect(() => {
    if (editId) {
      loadInvoiceForEdit(editId)
    }
  }, [editId])

  async function loadInvoiceForEdit(id) {
    // 1. Fetch Invoice Details
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
    if (inv) {
      setInvoiceNo(inv.invoice_number)
      setRefNo(inv.reference_number || '')
      setInvoiceDate(inv.invoice_date)
      setSelectedCustomer(inv.customer_id)
      setIsGstBill(inv.is_gst_bill !== false)
      
      // 2. Fetch Items
      const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', id)
      
      // 3. Map Database Items back to UI Rows
      const formattedRows = items.map(item => ({
        description: item.description,
        subheading: item.subheading || '', // Load subheading
        hsn: item.hsn_sac_code,
        qty: item.quantity_billed,
        rate: item.rate,
        unit: item.unit || 'NOS',
        amount: item.taxable_value
      }))
      setRows(formattedRows)
    }
  }

  // --- 2. LOAD DATA FROM SUPABASE ---
  useEffect(() => {
    async function loadData() {
      const { data: custData } = await supabase.from('customers').select('*')
      const { data: prodData } = await supabase.from('products').select('*')
      if (custData) setCustomers(custData)
      if (prodData) setProducts(prodData)
    }
    loadData()
  }, [])

  // --- 3. CALCULATIONS (The Math) ---
  useEffect(() => {
    let taxable = 0
    rows.forEach(row => {
      taxable += (row.qty * row.rate)
    })
    
    // Simple 18% Tax Logic (We will make this dynamic later)
    const taxAmount = taxable * 0.18 
    
    setTotals({
      taxable: taxable,
      tax: taxAmount,
      grand: taxable + taxAmount
    })
  }, [rows])

  // --- 4. HANDLERS (User Actions) ---
  const handleRowChange = (index, field, value) => {
    const newRows = [...rows]
    newRows[index][field] = value
    
    // Auto-calculate amount for this row
    if (field === 'qty' || field === 'rate') {
      const q = parseFloat(newRows[index].qty) || 0
      const r = parseFloat(newRows[index].rate) || 0
      newRows[index].amount = q * r
    }
    
    // Auto-fill details if product is selected
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

  // --- NEW: SAVE FUNCTION ---
  const [invoiceNo, setInvoiceNo] = useState('') // Default or Dynamic
  const [refNo, setRefNo] = useState('') 
  const [isSaving, setIsSaving] = useState(false)

  async function saveInvoice() {
    if (!selectedCustomer) return alert('Select a Customer')
    if (rows.length === 0) return alert('Add at least one item')

    let currentInvoiceId = editId

    // CALCULATE TOTALS
    const totalTaxable = rows.reduce((sum, row) => sum + row.amount, 0)
    
    // IF GST BILL: Calculate Tax (9% + 9%)
    // IF NON-GST: Tax is 0
    const totalCGST = isGstBill ? totalTaxable * 0.09 : 0
    const totalSGST = isGstBill ? totalTaxable * 0.09 : 0
    
    const grandTotal = totalTaxable + totalCGST + totalSGST
    
    // Convert to words (You can reuse the function from print page or keep it simple here)
    // For now, let's keep it simple or send empty to let Print page handle it on the fly.
    
    const invoiceData = {
      customer_id: selectedCustomer,
      invoice_number: invoiceNo,
      reference_number: refNo,
      invoice_date: invoiceDate,
      total_taxable_value: totalTaxable,
      total_cgst_amount: totalCGST,
      total_sgst_amount: totalSGST,
      grand_total: grandTotal,
      is_gst_bill: isGstBill
      // You can generate words here or let the print page calculate it dynamically
    }

    if (editId) {
      // --- UPDATE MODE ---
      // 1. Update Invoice Header
      const { error } = await supabase.from('invoices').update(invoiceData).eq('id', editId)
      if (error) return alert('Error updating: ' + error.message)

      // 2. Delete Old Items (Easiest way to handle updates)
      await supabase.from('invoice_items').delete().eq('invoice_id', editId)
      
      // (Items will be re-inserted below)
    } else {
      // --- CREATE MODE ---
      const { data, error } = await supabase.from('invoices').insert([invoiceData]).select()
      if (error) return alert('Error saving: ' + error.message)
      currentInvoiceId = data[0].id
    }

    // 3. Insert Items (For both Create and Update)
    const itemsToSave = rows.map(row => ({
      invoice_id: currentInvoiceId,
      description: row.description,
      subheading: row.subheading,
      hsn_sac_code: row.hsn,
      quantity_billed: row.qty,
      quantity_shipped: row.qty, // Assuming same
      rate: row.rate,
      unit: row.unit || 'NOS',
      taxable_value: row.amount,
      // Add tax amounts per item if your DB requires it
      cgst_amount: row.amount * 0.09,
      sgst_amount: row.amount * 0.09,
      cgst_rate: 9,
      sgst_rate: 9
    }))

    const { error: itemError } = await supabase.from('invoice_items').insert(itemsToSave)

    if (itemError) alert('Error saving items: ' + itemError.message)
    else {
      // Success! Go to print page
      router.push(`/print/${currentInvoiceId}`)
    }
  }

  async function saveNewCustomer() {
    if (!newCust.name) return alert('Enter Company Name')
    
    const { data, error } = await supabase.from('customers').insert([{
      company_name: newCust.name,
      address: newCust.address,
      gstin: newCust.gstin,
      phone: newCust.phone,
      state: 'Kerala', // Default
      state_code: 32,
      place_of_supply: 'Kerala'
    }]).select()

    if (error) alert('Error: ' + error.message)
    else {
      setCustomers([...customers, data[0]]) // Update list
      setSelectedCustomer(data[0].id) // Auto-select them
      setShowCustForm(false) // Close form
      setNewCust({ name: '', address: '', gstin: '', phone: '' }) // Reset
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
      setProducts([...products, data[0]]) // Update list
      setShowProdForm(false) // Close form
      setNewProd({ name: '', hsn: '', rate: 0, unit: 'NOS', gst: 18 }) // Reset
    }
  }

  // --- 5. THE UI (The Look) ---
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>METRO DIGITAL PRINTING</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Ernakulam, Kerala</p>
          <Link href="/history">
            <button style={{ marginTop: '10px', fontSize: '12px', cursor: 'pointer', padding: '5px' }}>
              📂 View Past Invoices
            </button>
          </Link>
          <Link href="/manage">
            <button style={{ fontSize: '12px', cursor: 'pointer', padding: '5px', background: '#e2e6ea', border: '1px solid #ccc' }}>
              ⚙️ Manage Items/Customers
            </button>
          </Link>
          <div style={{ display: 'flex', gap: '10px' }}>
            {role === 'admin' && (
                <Link href="/admin/users"><button style={{ padding: '5px' }}>👑 Manage Users</button></Link>
            )}
            <Link href="/profile"><button style={{ padding: '5px' }}>👤 Profile</button></Link>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0, color: '#444' }}>TAX INVOICE</h1>
          
          
          <input 
            type="text" 
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="Invoice No (e.g. MD/01)"
            style={{ padding: '5px', marginTop: '5px', textAlign: 'right', display: 'block', width: '100%' }}
          />

          <input 
            type="text" 
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            placeholder="Ref No (e.g. MP/Q/32...)"
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

      {/* CUSTOMER SELECTION */}
      <div style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
           <label style={{ fontWeight: 'bold' }}>Bill To:</label>
           <button 
             onClick={() => setShowCustForm(!showCustForm)}
             style={{ background: '#007bff', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '12px' }}
           >
             {showCustForm ? '- Cancel' : '+ New Customer'}
           </button>
        </div>

        {/* The Dropdown */}
        <select 
          style={{ width: '100%', padding: '8px', fontSize: '14px', marginBottom: '10px' }}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          value={selectedCustomer}
        >
          <option value="">-- Select Customer --</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>

        {/* The "New Customer" Form (Hidden by default) */}
        {showCustForm && (
          <div style={{ background: '#e9ecef', padding: '10px', border: '1px solid #ccc', marginTop: '5px' }}>
            <input placeholder="Company Name" style={{ width: '100%', padding: '5px', marginBottom: '5px' }} 
              value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
            <textarea placeholder="Address (Use Enter for lines)" style={{ width: '100%', padding: '5px', marginBottom: '5px', height: '60px' }} 
              value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} />
            <div style={{ display: 'flex', gap: '5px' }}>
              <input placeholder="GSTIN" style={{ flex: 1, padding: '5px' }} 
                value={newCust.gstin} onChange={e => setNewCust({...newCust, gstin: e.target.value})} />
              <input placeholder="Phone" style={{ flex: 1, padding: '5px' }} 
                value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} />
            </div>
            <button onClick={saveNewCustomer} style={{ marginTop: '10px', width: '100%', background: '#28a745', color: 'white', padding: '8px', border: 'none', cursor: 'pointer' }}>
              Save Customer
            </button>
          </div>
        )}
      </div>

      {/* THE GRID (Tally Style) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#333', color: 'white', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Description of Goods</th>
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
                    placeholder="Subheading (e.g. Palat- Logo)"
                    style={{ width: '100%', padding: '5px', marginTop: '2px', fontSize: '11px', fontStyle: 'italic', borderTop: 'none' }}
                  />
                <datalist id="products">
                  {products.map(p => <option key={p.id} value={p.item_name} />)}
                </datalist>
              </td>
              <td>
                <input 
                  value={row.hsn}
                  onChange={(e) => handleRowChange(index, 'hsn', e.target.value)}
                  style={{ width: '100%', padding: '5px', border: 'none' }} 
                />
              </td>
              <td>
                <input 
                  type="number" value={row.qty}
                  onChange={(e) => handleRowChange(index, 'qty', e.target.value)}
                  style={{ width: '100%', padding: '5px', border: 'none' }} 
                />
              </td>
              <td>
                <input 
                  type="number" value={row.rate}
                  onChange={(e) => handleRowChange(index, 'rate', e.target.value)}
                  style={{ width: '100%', padding: '5px', border: 'none' }} 
                />
              </td>
              <td style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 'bold' }}>
                {row.amount.toFixed(2)}
              </td>
              <td style={{ textAlign: 'center' }}>
                <button 
                  onClick={() => removeRow(index)}
                  style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  X
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: 'right', marginBottom: '5px' }}>
         <button 
           onClick={() => setShowProdForm(!showProdForm)}
           style={{ background: '#666', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '12px' }}
         >
           {showProdForm ? '- Cancel' : '+ Create New Product'}
         </button>
      </div>

      {/* The "New Product" Form */}
      {showProdForm && (
        <div style={{ background: '#fff3cd', padding: '10px', border: '1px solid #ffeeba', marginBottom: '10px' }}>
          
          {/* Row 1: Name & HSN */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
             <input placeholder="Item Name (e.g. Flex Printing)" style={{ flex: 2, padding: '5px' }} 
               value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} />
             <input placeholder="HSN Code" style={{ flex: 1, padding: '5px' }} 
               value={newProd.hsn} onChange={e => setNewProd({...newProd, hsn: e.target.value})} />
          </div>

          {/* Row 2: Rate, Unit, GST */}
          <div style={{ display: 'flex', gap: '10px' }}>
             <input type="number" placeholder="Rate" style={{ flex: 1, padding: '5px' }} 
               value={newProd.rate} onChange={e => setNewProd({...newProd, rate: e.target.value})} />
             
             {/* Unit Input */}
             <select 
                style={{ flex: 1, padding: '5px' }} 
                value={newProd.unit} 
                onChange={e => setNewProd({...newProd, unit: e.target.value})}
             >
                <option value="NOS">NOS</option>
                <option value="SQFT">SQFT</option>
                <option value="KG">KG</option>
                <option value="MTR">MTR</option>
             </select>

             {/* GST Input */}
             <input type="number" placeholder="GST %" style={{ flex: 1, padding: '5px' }} 
               value={newProd.gst} onChange={e => setNewProd({...newProd, gst: e.target.value})} />

             <button onClick={saveNewProduct} style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px 15px', cursor: 'pointer' }}>
               Add
             </button>
          </div>
        </div>
      )}

      {/* GST TOGGLE */}
      <div style={{ marginBottom: '10px', padding: '10px', background: '#e2e6ea', borderRadius: '4px' }}>
        <label style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={isGstBill} 
            onChange={(e) => setIsGstBill(e.target.checked)}
            style={{ width: '20px', height: '20px', marginRight: '10px' }}
          />
          Generate GST Invoice (Uncheck for Bill of Supply / Non-GST)
        </label>
      </div>

      <button 
        onClick={addRow} 
        style={{ background: '#eee', border: '1px dashed #999', width: '100%', padding: '10px', cursor: 'pointer' }}
      >
        + Add Line Item
      </button>

      {/* FOOTER TOTALS */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <div style={{ width: '300px', textAlign: 'right' }}>
          <div style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
            Taxable Value: <strong>{totals.taxable.toFixed(2)}</strong>
          </div>
          <div style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
            Total Tax (18%): <strong>{totals.tax.toFixed(2)}</strong>
          </div>
          <div style={{ padding: '10px', fontSize: '18px', background: '#f0f0f0', marginTop: '10px' }}>
            Grand Total: <strong>₹ {totals.grand.toFixed(2)}</strong>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '30px', borderTop: '2px solid #333', paddingTop: '20px', textAlign: 'right' }}>
        <button 
          onClick={saveInvoice}
          disabled={isSaving}
          style={{ 
            background: isSaving ? '#ccc' : '#28a745', 
            color: 'white', 
            padding: '15px 40px', 
            fontSize: '18px', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          {editId ? 'Update Invoice' : 'Save & Print'}
        </button>
      </div>

    </div>
  )
}