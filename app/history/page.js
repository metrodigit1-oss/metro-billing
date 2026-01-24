'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HistoryPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    // We fetch the invoice AND the related customer name in one go
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers ( company_name )
      `)
      .order('id', { ascending: false }) // Newest first

    if (error) console.log('Error:', error)
    else setInvoices(data)
    setLoading(false)
  }

  async function deleteInvoice(id) {
    if(!confirm('Are you sure you want to delete this invoice?')) return;

    const { error } = await supabase.from('invoices').delete().eq('id', id)
    
    if (error) alert('Error deleting')
    else {
      // Refresh the list locally
      setInvoices(invoices.filter(inv => inv.id !== id))
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    // Get short month name (Jan, Feb, etc.)
    const month = date.toLocaleString('default', { month: 'short' });
    // Get last 2 digits of year
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}-${month}-${year}`;
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>📂 Invoice History</h1>
        <Link href="/">
          <button style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>
            + Create New Invoice
          </button>
        </Link>
      </div>

      {loading ? <p>Loading records...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={{ padding: '15px' }}>Date</th>
              <th style={{ padding: '15px' }}>Invoice No</th>
              <th style={{ padding: '15px' }}>Customer</th>
              <th style={{ padding: '15px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>{formatDate(inv.invoice_date)}</td>
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
                    >
                        ✏️ Edit
                    </button>
                  <button 
                    onClick={() => router.push(`/print/${inv.id}`)}
                    style={{ 
                      padding: '5px 15px', 
                      background: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🖨️ Print
                  </button>
                  <button 
                        onClick={() => deleteInvoice(inv.id)}
                        style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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