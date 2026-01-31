'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabaseClient'
import Link from 'next/link'

export default function BankLedgerPage() {
  const [entries, setEntries] = useState([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ debit: 0, credit: 0 })

  useEffect(() => {
    fetchBankBook()
    fetchOpeningBalance() // <--- Load saved balance
  }, [])

  useEffect(() => {
    const tDebit = entries.reduce((sum, item) => sum + (item.debit || 0), 0)
    const tCredit = entries.reduce((sum, item) => sum + (item.credit || 0), 0)
    setTotals({ debit: tDebit, credit: tCredit })
  }, [entries])

  // --- NEW: Fetch Opening Balance ---
  async function fetchOpeningBalance() {
    const { data } = await supabase
      .from('ledger_settings')
      .select('setting_value')
      .eq('setting_key', 'bank_opening') // <--- Different key for Bank
      .single()
    
    if (data) setOpeningBalance(data.setting_value)
  }

  // --- NEW: Save Opening Balance on Blur ---
  async function saveOpeningBalance() {
    await supabase
      .from('ledger_settings')
      .update({ setting_value: openingBalance })
      .eq('setting_key', 'bank_opening')
  }

  async function fetchBankBook() {
    const { data } = await supabase
        .from('bank_book')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
    
    if (data) {
        const processedData = data.map((item, index) => ({
            ...item,
            dynamicVchNo: index + 1
        }))
        setEntries(processedData)
    }
    setLoading(false)
  }

  async function deleteEntry(id) {
    if(!confirm("Are you sure?")) return;
    await supabase.from('bank_book').delete().eq('id', id)
    fetchBankBook()
  }

  function formatDate(dateString) {
    const d = new Date(dateString)
    const day = d.getDate().toString().padStart(2, '0')
    const month = d.toLocaleString('default', { month: 'short' })
    const year = d.getFullYear().toString().slice(-2)
    return `${day}-${month}-${year}`
  }

  const closingBalance = openingBalance + totals.debit - totals.credit

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-sm">
      <div className="max-w-7xl mx-auto bg-white shadow-lg border border-gray-300 min-h-[80vh] flex flex-col">
        
        <div className="bg-[#2a6698] text-white p-2 flex justify-between items-center">
            <div className="font-bold">Ledger: Bank Account</div>
            <div className="text-xs">Global Chronological Order</div>
        </div>

        <div className="p-4 bg-[#fbfbfb] border-b flex justify-between items-center">
            <div className="flex items-center gap-4">
                <label className="font-bold text-gray-700">Opening Balance:</label>
                <input 
                    type="number" 
                    className="border border-gray-300 p-1 w-32 text-right font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    onBlur={saveOpeningBalance} // <--- Save on blur
                />
            </div>
            <div className="flex gap-2">
                <Link href="/bank/new">
                    <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-1 px-4 rounded shadow text-xs">
                        + New Bank Entry
                    </button>
                </Link>
                <Link href="/">
                    <button className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-4 rounded shadow text-xs">
                        X Close
                    </button>
                </Link>
            </div>
        </div>

        <div className="flex bg-[#e2e6ea] border-b border-gray-400 font-bold text-gray-800 text-center text-xs uppercase tracking-wide">
            <div className="w-24 p-2 border-r border-white">Date</div>
            <div className="flex-1 p-2 border-r border-white text-left">Particulars</div>
            <div className="w-24 p-2 border-r border-white">Vch Type</div>
            <div className="w-20 p-2 border-r border-white">Vch No.</div>
            <div className="w-32 p-2 border-r border-white text-right">Debit</div>
            <div className="w-32 p-2 border-r border-white text-right">Credit</div>
            <div className="w-10 p-2"></div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {loading ? <div className="p-4">Loading...</div> : entries.map((entry) => (
                <div key={entry.id} className="flex border-b border-gray-100 hover:bg-yellow-50 text-gray-800 h-8 items-center group">
                    <div className="w-24 px-2 text-center text-gray-600">{formatDate(entry.date)}</div>
                    
                    <div className="flex-1 px-2 font-medium truncate cursor-pointer hover:text-blue-600">
                        <Link href={`/bank/new?id=${entry.id}`}>
                            {entry.particulars}
                        </Link>
                    </div>
                    
                    <div className="w-24 px-2 text-center text-xs">{entry.vch_type}</div>
                    
                    <div className="w-20 px-2 text-center text-gray-500 font-mono">
                        {entry.dynamicVchNo}
                    </div>

                    <div className="w-32 px-2 text-right font-mono font-bold text-gray-700">
                        {entry.debit > 0 ? entry.debit.toFixed(2) : ''}
                    </div>
                    <div className="w-32 px-2 text-right font-mono font-bold text-red-700">
                        {entry.credit > 0 ? entry.credit.toFixed(2) : ''}
                    </div>
                    
                    <div className="w-16 px-2 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/bank/new?id=${entry.id}`}>
                            <button className="text-blue-500 hover:text-blue-700 font-bold">✎</button>
                        </Link>
                        <button onClick={() => deleteEntry(entry.id)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-[#f0f0f0] border-t border-gray-400 text-sm">
            <div className="flex border-b border-gray-300">
                <div className="flex-1 p-1 text-right pr-4 font-semibold text-gray-600">Opening Balance :</div>
                <div className="w-32 p-1 text-right font-mono text-gray-600">{openingBalance.toFixed(2)}</div>
                <div className="w-32 p-1 bg-gray-200"></div>
                <div className="w-10"></div>
            </div>

            <div className="flex border-b border-gray-300 font-bold">
                <div className="flex-1 p-1 text-right pr-4 text-gray-800">Current Total :</div>
                <div className="w-32 p-1 text-right font-mono border-t border-gray-400">{totals.debit.toFixed(2)}</div>
                <div className="w-32 p-1 text-right font-mono border-t border-gray-400">{totals.credit.toFixed(2)}</div>
                <div className="w-10"></div>
            </div>

            <div className="flex font-bold bg-[#e2e6ea] text-gray-900 h-10 items-center">
                <div className="flex-1 text-right pr-4">Closing Balance :</div>
                <div className="w-64 text-center font-mono text-lg border-double border-t-4 border-gray-400">
                    {closingBalance.toFixed(2)} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                </div>
                <div className="w-10"></div>
            </div>
        </div>

      </div>
    </div>
  )
}