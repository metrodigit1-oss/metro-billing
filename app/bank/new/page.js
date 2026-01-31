'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../../utils/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function BankEntryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BankForm />
    </Suspense>
  )
}

function BankForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState([])
  
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    particulars: '',
    vch_type: 'Bank Payment', 
    vch_no: '',
    amount: ''
  })

  useEffect(() => {
    fetchCustomers()
    if (editId) {
      loadEntryForEdit(editId)
    } else {
      fetchNextVchNo() 
    }
  }, [editId])

  // Removed the useEffect for formData.vch_type as Vch No is now global

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('company_name')
    if(data) setCustomers(data)
  }

  async function loadEntryForEdit(id) {
    const { data, error } = await supabase.from('bank_book').select('*').eq('id', id).single()
    if (error) {
      alert('Error loading entry')
      router.push('/bank')
      return
    }
    
    setFormData({
      date: data.date,
      particulars: data.particulars,
      vch_type: data.vch_type,
      vch_no: data.vch_no,
      amount: data.debit > 0 ? data.debit : data.credit 
    })
  }

  async function fetchNextVchNo() {
    if(editId) return; 

    // Count ALL rows in bank_book
    const { count } = await supabase
      .from('bank_book')
      .select('*', { count: 'exact', head: true })
    
    setFormData(prev => ({ ...prev, vch_no: (count || 0) + 1 }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.particulars || !formData.amount) return alert('Please fill all fields')
    
    setLoading(true)

    const isReceipt = formData.vch_type === 'Bank Receipt'
    
    const entryData = {
        date: formData.date,
        particulars: formData.particulars,
        vch_type: formData.vch_type,
        vch_no: formData.vch_no,
        debit: isReceipt ? parseFloat(formData.amount) : 0,
        credit: !isReceipt ? parseFloat(formData.amount) : 0
    }

    let error;

    if (editId) {
      const res = await supabase.from('bank_book').update(entryData).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('bank_book').insert([entryData])
      error = res.error
    }

    if (error) {
        alert('Error: ' + error.message)
    } else {
        router.push('/bank')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {editId ? 'Edit Bank Entry' : 'New Bank Entry'}
          </h1>
          <Link href="/bank">
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              &larr; Back to Bank Book
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vch Type</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="vch_type" 
                                value="Bank Payment" 
                                checked={formData.vch_type === 'Bank Payment'}
                                onChange={e => setFormData({...formData, vch_type: e.target.value})}
                                className="w-5 h-5 text-red-600"
                            />
                            <span className="font-medium text-red-700">Bank Payment (Out)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="vch_type" 
                                value="Bank Receipt" 
                                checked={formData.vch_type === 'Bank Receipt'}
                                onChange={e => setFormData({...formData, vch_type: e.target.value})}
                                className="w-5 h-5 text-green-600"
                            />
                            <span className="font-medium text-green-700">Bank Receipt (In)</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                        <input 
                            type="date"
                            className="w-full p-2 border rounded-lg"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Vch No.</label>
                        <input 
                            type="text"
                            className="w-full p-2 border rounded-lg bg-gray-50"
                            value={formData.vch_no}
                            onChange={e => setFormData({...formData, vch_no: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Particulars</label>
                    <input 
                        list="customers"
                        className="w-full p-2 border rounded-lg"
                        placeholder="Enter Name"
                        value={formData.particulars}
                        onChange={e => setFormData({...formData, particulars: e.target.value})}
                    />
                    <datalist id="customers">
                        {customers.map((c, i) => <option key={i} value={c.company_name} />)}
                    </datalist>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        {formData.vch_type === 'Bank Payment' ? 'Credit Amount (₹)' : 'Debit Amount (₹)'}
                    </label>
                    <input 
                        type="number"
                        step="0.01"
                        className="w-full p-2 border rounded-lg text-lg font-bold"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                    />
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 text-white font-bold rounded-lg shadow-md transition-all ${
                        formData.vch_type === 'Bank Payment' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                    {loading ? 'Processing...' : (editId ? 'Update Entry' : `Save ${formData.vch_type}`)}
                </button>

            </form>
        </div>
      </div>
    </div>
  )
}