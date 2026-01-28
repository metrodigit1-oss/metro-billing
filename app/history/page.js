'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HistoryPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  
  // FILTER STATES
  const [filterType, setFilterType] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers ( company_name )
      `)
      .order('id', { ascending: false })

    if (error) console.log('Error:', error)
    else setInvoices(data)
    setLoading(false)
  }

  async function deleteInvoice(id) {
    if(!confirm('Are you sure you want to delete this invoice?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) alert('Error deleting')
    else setInvoices(invoices.filter(inv => inv.id !== id))
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  }

  // FILTER LOGIC
  const filteredInvoices = invoices.filter(inv => {
    // 1. Filter by Type
    const invType = inv.invoice_type || 'SALE'
    const matchesType = filterType === 'ALL' || invType === filterType

    // 2. Filter by Search
    const partyName = inv.customers?.company_name || ''
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partyName.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesType && matchesSearch
  })

  // Helper for Label Colors
  const getTypeColor = (type) => {
    if(type === 'PURCHASE') return '#dc3545'; // Red
    if(type === 'SALE') return '#28a745'; // Green
    if(type === 'RAW_MATERIALS') return '#e0a800'; // Yellow/Orange
    if(type === 'MACHINE_MAINTENANCE') return '#17a2b8'; // Blue
    return '#666';
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>📂 Invoice History</h1>
        <Link href="/">
          <button style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
            + Create New Invoice
          </button>
        </Link>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
        <input 
          type="text" 
          placeholder="🔍 Search Invoice No or Party..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', minWidth: '150px' }}
        >
          <option value="ALL">All Types</option>
          <option value="SALE">Sale</option>
          <option value="PURCHASE">Purchase</option>
          <option value="RAW_MATERIALS">Raw Materials</option>
          <option value="MACHINE_MAINTENANCE">Machine Maint.</option>
        </select>
      </div>

      {loading ? <p>Loading records...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ padding: '15px' }}>Date</th>
              <th style={{ padding: '15px' }}>Type</th>
              <th style={{ padding: '15px' }}>Invoice No</th>
              <th style={{ padding: '15px' }}>Party</th>
              <th style={{ padding: '15px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No invoices found matching your filters.
                </td>
              </tr>
            )}
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>{formatDate(inv.invoice_date)}</td>
                <td style={{ padding: '15px' }}>
                    <span style={{ 
                        background: getTypeColor(inv.invoice_type || 'SALE'), 
                        color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'
                    }}>
                        {(inv.invoice_type || 'SALE').replace('_', ' ')}
                    </span>
                </td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{inv.invoice_number}</td>
                <td style={{ padding: '15px' }}>
                  {inv.customers?.company_name || 'Unknown'}
                </td>
                <td style={{ padding: '15px', textAlign: 'right', color: 'green', fontWeight: 'bold' }}>
                  ₹ {inv.grand_total.toFixed(2)}
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button 
                        onClick={() => router.push(`/?id=${inv.id}`)}
                        style={{ marginRight: '10px', background: '#ffc107', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px' }}
                        title="Edit"
                    >
                        ✏️
                    </button>
                  <button 
                    onClick={() => router.push(`/print/${inv.id}`)}
                    style={{ 
                      padding: '5px 15px', 
                      background: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                    title="Print"
                  >
                    🖨️
                  </button>
                  <button 
                        onClick={() => deleteInvoice(inv.id)}
                        style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        title="Delete"
                    >
                        🗑️
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}