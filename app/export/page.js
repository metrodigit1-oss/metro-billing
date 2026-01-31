'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ExportPage() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  
  // FILTER STATES
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // REPORT TYPE STATE
  const [reportType, setReportType] = useState('INVOICES') // 'INVOICES', 'CASH', 'BANK', 'CUSTOMERS', 'PRODUCTS'

  // INVOICE SPECIFIC FILTERS
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [customers, setCustomers] = useState([])
  const [selectedParty, setSelectedParty] = useState('ALL')
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
      if (reportType === 'INVOICES') {
        await exportInvoices()
      } else if (reportType === 'CASH') {
        await exportLedger('cash_book', 'Cash_Book')
      } else if (reportType === 'BANK') {
        await exportLedger('bank_book', 'Bank_Book')
      } else if (reportType === 'CUSTOMERS') {
        await exportMasterData('customers', 'Customer_List')
      } else if (reportType === 'PRODUCTS') {
        await exportMasterData('products', 'Product_List')
      }
    } catch (err) {
      alert("Export failed: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const exportInvoices = async () => {
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
      if (paymentModeFilter !== 'ALL') query = query.eq('payment_mode', paymentModeFilter)
      if (gstFilter !== 'ALL') query = query.eq('is_gst_bill', gstFilter === 'GST')

      const { data, error } = await query
      if (error) throw error

      if (data.length === 0) {
        alert("No invoices found for the selected filters.")
        return
      }

      const headers = [
        "Date", "Invoice No", "Type", "Mode", "Party Name", "GSTIN", 
        "Taxable Value", "CGST", "SGST", "Total Amount", "Status"
      ]

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

      generateCSV(headers, rows, `Metro_Invoices_${new Date().toISOString().split('T')[0]}`)
  }

  const exportLedger = async (tableName, fileNamePrefix) => {
      let query = supabase
        .from(tableName)
        .select('*')
        .order('date', { ascending: true })

      if (startDate) query = query.gte('date', startDate)
      if (endDate) query = query.lte('date', endDate)

      const { data, error } = await query
      if (error) throw error

      if (data.length === 0) {
        alert(`No records found in ${fileNamePrefix.replace('_', ' ')} for the selected dates.`)
        return
      }

      const headers = [
        "Date", "Vch Type", "Vch No", "Particulars", "Debit", "Credit"
      ]

      const rows = data.map(item => [
        item.date,
        item.vch_type,
        item.vch_no,
        `"${item.particulars?.replace(/"/g, '""')}"`, // Escape quotes
        item.debit || 0,
        item.credit || 0
      ])

      generateCSV(headers, rows, `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}`)
  }

  const exportMasterData = async (tableName, fileNamePrefix) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    if (data.length === 0) {
      alert(`No data found in ${fileNamePrefix.replace('_', ' ')}.`)
      return
    }

    let headers = []
    let rows = []

    if (tableName === 'customers') {
      headers = ["ID", "Company Name", "Address", "Phone", "GSTIN", "Place of Supply"]
      rows = data.map(item => [
        item.id,
        `"${item.company_name?.replace(/"/g, '""')}"`,
        `"${item.address?.replace(/"/g, '""')}"`,
        item.phone || '',
        item.gstin || '',
        item.place_of_supply || ''
      ])
    } else if (tableName === 'products') {
      headers = ["ID", "Item Name", "HSN/SAC", "Default Rate", "Unit", "GST Rate"]
      rows = data.map(item => [
        item.id,
        `"${item.item_name?.replace(/"/g, '""')}"`,
        item.hsn_sac_code || '',
        item.default_rate || 0,
        item.unit || '',
        item.gst_rate || 0
      ])
    }

    generateCSV(headers, rows, `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}`)
  }

  const generateCSV = (headers, rows, filename) => {
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isMasterData = ['CUSTOMERS', 'PRODUCTS'].includes(reportType)

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Export Reports</h1>
          {/* Back Button handles context logic */}
          <Link href="/history" className="text-blue-600 hover:underline">← Back to History</Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          
          {/* Report Type Selector */}
          <div className="border-b pb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Select Report Type</label>
            <div className="flex gap-2 flex-wrap">
                {['INVOICES', 'CASH', 'BANK', 'CUSTOMERS', 'PRODUCTS'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setReportType(type)}
                        className={`px-4 py-2 rounded-lg font-medium border transition-colors text-sm ${
                            reportType === type 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {type === 'INVOICES' ? 'Invoices' 
                         : type === 'CASH' ? 'Cash Book' 
                         : type === 'BANK' ? 'Bank Book'
                         : type === 'CUSTOMERS' ? 'Customers List'
                         : 'Products List'}
                    </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Common Date Filters (Hidden for Master Data) */}
            {!isMasterData && (
              <>
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
              </>
            )}

            {/* Invoice Specific Filters */}
            {reportType === 'INVOICES' && (
                <>
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
                </>
            )}
          </div>

          <div className="pt-6 border-top">
            <button 
              onClick={handleExport}
              disabled={loading}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : `📥 Download ${
                  reportType === 'INVOICES' ? 'Invoices' 
                : reportType === 'CASH' ? 'Cash Book' 
                : reportType === 'BANK' ? 'Bank Book'
                : reportType === 'CUSTOMERS' ? 'Customers List'
                : 'Products List'} CSV`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}