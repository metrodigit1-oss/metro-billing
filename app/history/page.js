'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function HistoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnToMonth = searchParams.get('month') 

  const [loading, setLoading] = useState(true)
  
  // DATA STATES
  const [allInvoices, setAllInvoices] = useState([]) // Raw data
  const [monthlyData, setMonthlyData] = useState([]) // Processed/Filtered data
  
  // FILTER STATES
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState([])

  // VIEW STATES
  const [view, setView] = useState('SUMMARY') 
  const [selectedMonth, setSelectedMonth] = useState(null)

  // FILTERS
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [gstFilter, setGstFilter] = useState('ALL') // NEW: GST Filter State

  useEffect(() => {
    fetchInvoices()
  }, [])

  // Re-calculate report when ANY filter or raw data changes
  useEffect(() => {
    if (allInvoices.length > 0) {
      calculateMonthlyReport(allInvoices)
    } else {
      setMonthlyData([]) // Clear data if no invoices loaded
    }
  }, [allInvoices, filterType, gstFilter]) // Added gstFilter dependency

  // Keep selectedMonth synced if data updates
  useEffect(() => {
    if (selectedMonth && monthlyData.length > 0) {
      const updatedMonth = monthlyData.find(m => m.key === selectedMonth.key)
      if (updatedMonth) {
        setSelectedMonth(updatedMonth)
      } else {
        setView('SUMMARY')
        setSelectedMonth(null)
      }
    }
  }, [monthlyData])

  useEffect(() => {
    if (returnToMonth && monthlyData.length > 0) {
      const targetMonth = monthlyData.find(m => m.key === returnToMonth)
      if (targetMonth) {
        const monthYear = parseInt(targetMonth.key.split('-')[0])
        setSelectedYear(monthYear)
        openMonth(targetMonth)
      }
    }
  }, [returnToMonth, monthlyData])

  async function fetchInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers ( company_name )
      `)
      .order('invoice_date', { ascending: true }) 

    if (error) console.log('Error:', error)
    else {
      setAllInvoices(data || [])
    }
    setLoading(false)
  }

  function calculateMonthlyReport(rawInvoices) {
    // 1. Assign Global Serial Number BEFORE filtering
    const invoicesWithSerial = rawInvoices.map((inv, index) => ({
      ...inv,
      vchNo: index + 1 
    }))

    // 2. Apply Filters (Type AND GST)
    const filteredInvoices = invoicesWithSerial.filter(inv => {
        // Type Filter
        if (filterType !== 'ALL') {
            const invType = inv.invoice_type || 'SALE'
            if (invType !== filterType) return false
        }

        // GST Filter
        if (gstFilter !== 'ALL') {
            const isGst = inv.is_gst_bill === true
            if (gstFilter === 'GST' && !isGst) return false
            if (gstFilter === 'NON_GST' && isGst) return false
        }

        return true
    })

    const groups = {}
    
    // 3. Group by Month
    filteredInvoices.forEach(inv => {
      if(!inv.invoice_date) return;
      const d = new Date(inv.invoice_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      
      if (!groups[key]) {
        groups[key] = {
          key: key,
          monthName: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
          invoices: [],
          totalDebit: 0
        }
      }
      
      groups[key].invoices.push(inv)
      groups[key].totalDebit += (inv.grand_total || 0)
    })

    // 4. Sort Keys
    const sortedKeys = Object.keys(groups).sort()
    
    let runningBalance = 0
    
    let reportData = sortedKeys.map(key => {
        const item = groups[key]
        runningBalance += item.totalDebit
        
        // 5. Sort Invoices
        item.invoices.sort((a, b) => b.vchNo - a.vchNo)

        return {
            ...item,
            closingBalance: runningBalance
        }
    })

    reportData = reportData.reverse()

    // Extract years from FILTERED data
    const years = [...new Set(reportData.map(d => parseInt(d.key.split('-')[0])))].sort().reverse()
    setAvailableYears(years)
    
    // Adjust selected year if current selection is invalid
    if (years.length > 0 && !years.includes(selectedYear)) {
       setSelectedYear(years[0])
    }

    setMonthlyData(reportData)
  }

  async function deleteInvoice(id) {
    if(!confirm('Are you sure you want to delete this invoice?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) alert('Error deleting')
    else fetchInvoices() 
  }

  function openMonth(monthItem) {
    setSelectedMonth(monthItem)
    setView('DETAIL')
    setSearchTerm('') 
  }

  function handleEditInvoice(id) {
      if (selectedMonth) {
          router.push(`/?id=${id}&returnMonth=${selectedMonth.key}`)
      } else {
          router.push(`/?id=${id}`)
      }
  }

  function handleExportMonth() {
    if (!selectedMonth) return
    const [year, month] = selectedMonth.key.split('-').map(Number)
    const startDate = `${selectedMonth.key}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${selectedMonth.key}-${String(lastDay).padStart(2, '0')}`
    router.push(`/export?start=${startDate}&end=${endDate}`)
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  }

  const getFilteredInvoices = () => {
    if (!selectedMonth) return []
    return selectedMonth.invoices.filter(inv => {
      const partyName = inv.customers?.company_name || ''
      const vchNoStr = String(inv.vchNo)
      return vchNoStr.includes(searchTerm) ||
             partyName.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }

  const filteredInvoices = getFilteredInvoices()
  const visibleMonths = monthlyData.filter(m => m.key.startsWith(String(selectedYear)))
  
  const yearTotalDebit = visibleMonths.reduce((sum, m) => sum + m.totalDebit, 0)
  const yearClosingBalance = visibleMonths.length > 0 ? visibleMonths[0].closingBalance : 0

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900">
                {view === 'SUMMARY' ? 'Particulars' : `Particulars: ${selectedMonth?.monthName}`}
            </h1>
            
            {/* TYPE FILTER */}
            <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="p-2 bg-white border border-gray-300 rounded-lg text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="ALL">All Types</option>
                <option value="SALE">Sales</option>
                <option value="PURCHASE">Purchases</option>
                <option value="RAW_MATERIALS">Raw Materials</option>
                <option value="MACHINE_MAINTENANCE">Machine Maint.</option>
            </select>

            {/* GST FILTER */}
            <select 
                value={gstFilter} 
                onChange={(e) => setGstFilter(e.target.value)}
                className="p-2 bg-white border border-gray-300 rounded-lg text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="ALL">All Bills</option>
                <option value="GST">GST Only</option>
                <option value="NON_GST">Non-GST Only</option>
            </select>

            {view === 'SUMMARY' && availableYears.length > 0 && (
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="p-2 bg-white border border-gray-300 rounded-lg text-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            )}
          </div>

          <div className="flex gap-4">
            {view === 'DETAIL' ? (
               <div className="flex gap-3">
                   <button 
                     onClick={handleExportMonth}
                     className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                   >
                     📊 Export This Month
                   </button>
                   <button 
                     onClick={() => { setView('SUMMARY'); setSelectedMonth(null); }}
                     className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                   >
                     &larr; Back to Months
                   </button>
               </div>
            ) : (
                <>
                    <Link href="/">
                        <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors shadow-sm">
                        + New Invoice
                        </button>
                    </Link>
                    <Link href="/export">
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                        📊 Export
                        </button>
                    </Link>
                </>
            )}
          </div>
        </div>

        {loading ? <p className="text-gray-500">Loading data...</p> : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* VIEW 1: MONTHLY SUMMARY */}
            {view === 'SUMMARY' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-semibold">Month</th>
                    <th className="p-4 font-semibold text-right">Total Debit (₹)</th>
                    <th className="p-4 font-semibold text-right">Closing Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleMonths.length > 0 ? (
                    visibleMonths.map((item) => (
                        <tr 
                            key={item.key} 
                            onClick={() => openMonth(item)}
                            className="hover:bg-blue-50 transition-colors cursor-pointer group"
                        >
                        <td className="p-4 font-medium text-blue-600 group-hover:underline">
                            {item.monthName}
                        </td>
                        <td className="p-4 text-right font-medium">
                            {item.totalDebit.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-bold text-gray-800">
                            {item.closingBalance.toFixed(2)}
                        </td>
                        </tr>
                    ))
                  ) : (
                    <tr>
                        <td colSpan="3" className="p-8 text-center text-gray-500 italic">
                            No invoices match the selected filters.
                        </td>
                    </tr>
                  )}
                  {/* GAP ROW */}
                  <tr className="h-12 border-b border-gray-200 bg-gray-50/50">
                    <td colSpan="3"></td>
                  </tr>
                </tbody>
                {visibleMonths.length > 0 && (
                    <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <tr>
                            <td className="p-4 text-gray-900 text-lg">TOTAL ({selectedYear})</td>
                            <td className="p-4 text-right text-gray-900 text-lg">{yearTotalDebit.toFixed(2)}</td>
                            <td className="p-4 text-right text-gray-900 text-lg">{yearClosingBalance.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                )}
              </table>
            )}

            {/* VIEW 2: DRILL-DOWN INVOICE LIST */}
            {view === 'DETAIL' && selectedMonth && (
              <>
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex gap-4">
                <input 
                  type="text" 
                  placeholder="🔍 Search Vch No or Party..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
                />
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Particulars</th>
                    <th className="p-4 font-semibold">Type</th>
                    <th className="p-4 font-semibold">Vch No.</th>
                    <th className="p-4 font-semibold text-right">Amount (₹)</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-600">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="p-4 font-medium">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleEditInvoice(inv.id); }}
                            className="text-gray-900 hover:text-blue-600 hover:underline font-medium text-left"
                        >
                            {inv.customers?.company_name || 'Unknown Party'}
                        </button>
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${inv.is_gst_bill ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {inv.is_gst_bill ? 'GST' : 'Non-GST'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 font-mono">
                        {inv.vchNo}
                      </td>
                      <td className="p-4 text-right font-medium text-green-700">
                        {inv.grand_total.toFixed(2)}
                      </td>
                      <td className="p-4 text-center flex justify-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleEditInvoice(inv.id); }}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Edit"
                        >
                            ✏️
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); router.push(`/print/${inv.id}?month=${selectedMonth.key}`); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Print"
                        >
                            🖨️
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteInvoice(inv.id); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                        >
                            🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-400">No invoices found matching your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  )
}