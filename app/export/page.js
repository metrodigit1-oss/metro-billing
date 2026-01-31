'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ExportPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  
  // FILTER STATES
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [customers, setCustomers] = useState([])
  const [selectedParty, setSelectedParty] = useState('ALL')
  
  // NEW FILTERS
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL')
  const [gstFilter, setGstFilter] = useState('ALL')

  useEffect(() => {
    fetchInitialData()
    
    // Auto-fill dates from URL params if present
    const urlStart = searchParams.get('start')
    const urlEnd = searchParams.get('end')
    
    if (urlStart) setStartDate(urlStart)
    if (urlEnd) setEndDate(urlEnd)

  }, [searchParams])

  async function fetchInitialData() {
    const { data: custData } = await supabase.from('customers').select('id, company_name')
    if (custData) setCustomers(custData)
  }

  const handleExport = async () => {
  setLoading(true)
  try {
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        invoice_type,
        reference_number,
        payment_mode,
        total_taxable_value,
        total_cgst_amount,
        total_sgst_amount,
        grand_total,
        is_gst_bill,
        customers ( company_name, gstin )
      `)
      .order('invoice_date', { ascending: false })

      // Apply Filters
      if (startDate) query = query.gte('invoice_date', startDate)
      if (endDate) query = query.lte('invoice_date', endDate)
      if (typeFilter !== 'ALL') query = query.eq('invoice_type', typeFilter)
      if (selectedParty !== 'ALL') query = query.eq('customer_id', selectedParty)
      
      // New Filter Logic
      if (paymentModeFilter !== 'ALL') query = query.eq('payment_mode', paymentModeFilter)
      if (gstFilter !== 'ALL') query = query.eq('is_gst_bill', gstFilter === 'GST')

      const { data, error } = await query
      if (error) throw error

      if (data.length === 0) {
        alert("No records found for the selected filters.")
        return
      }

      exportToCSV(data)
    } catch (err) {
      alert("Export failed: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (data) => {
    // Define headers
    const headers = [
      "Date", "Invoice No", "Type", "Mode", "Party Name", "GSTIN", 
      "Taxable Value", "CGST", "SGST", "Total Amount", "Status"
    ]

    // Map data to rows
    const rows = data.map(inv => [
      inv.invoice_date,
      inv.invoice_number,
      inv.invoice_type || 'SALE',
      inv.payment_mode || 'CREDIT', 
      inv.customers?.company_name || 'N/A',
      inv.customers?.gstin || 'N/A',
      inv.total_taxable_value.toFixed(2),
      inv.total_cgst_amount.toFixed(2),
      inv.total_sgst_amount.toFixed(2),
      inv.grand_total.toFixed(2),
      inv.is_gst_bill ? "GST" : "Non-GST"
    ])

    // Combine headers and rows
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Metro_Invoices_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Export Reports</h1>
          <Link href="/history" className="text-blue-600 hover:underline">← Back to History</Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Filters */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">From Date</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded-lg"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">To Date</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded-lg"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            {/* Category Filters */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Invoice Type</label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Types</option>
                <option value="SALE">Sales</option>
                <option value="PURCHASE">Purchases</option>
                <option value="RAW_MATERIALS">Raw Materials</option>
                <option value="MACHINE_MAINTENANCE">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Specific Party</label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={selectedParty}
                onChange={e => setSelectedParty(e.target.value)}
              >
                <option value="ALL">All Parties</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            {/* NEW: Payment Mode Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Payment Mode</label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={paymentModeFilter}
                onChange={e => setPaymentModeFilter(e.target.value)}
              >
                <option value="ALL">All Modes</option>
                <option value="CREDIT">Credit</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>

            {/* NEW: GST Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Bill Status</label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={gstFilter}
                onChange={e => setGstFilter(e.target.value)}
              >
                <option value="ALL">All Bills</option>
                <option value="GST">GST Bills Only</option>
                <option value="NONGST">Non-GST Bills Only</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-top">
            <button 
              onClick={handleExport}
              disabled={loading}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : '📥 Generate & Download CSV Report'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              The report will include taxable values, tax breakdowns (CGST/SGST), and party information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}