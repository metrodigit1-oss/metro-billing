'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function PrintPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [company, setCompany] = useState(null)
  const [customer, setCustomer] = useState(null)
  const router = useRouter()
  

  useEffect(() => {
    if (params.id) loadInvoice(params.id)
  }, [params.id])

  async function loadInvoice(id) {
    // 1. Get Invoice Header
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
    if (inv) {
      setInvoice(inv)
      
      // 2. Get Related Customer
      const { data: cust } = await supabase.from('customers').select('*').eq('id', inv.customer_id).single()
      setCustomer(cust)

      // 3. Get Related Items
      const { data: invItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', id)
      setItems(invItems)
      
      // 4. Get Company Info (Hardcoded ID 1 or fetch single)
      const { data: comp } = await supabase.from('companies').select('*').limit(1).single()
      setCompany(comp)
      
      // Auto-trigger print after loading (Optional)
      // setTimeout(() => window.print(), 1000)
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

  function numberToWords(num) {
    if (!num) return '';
    
    // Ensure 2 decimal places and split
    const [rupees, paise] = Number(num).toFixed(2).split('.');
    
    // Inner function to convert integer part
    const convert = (n) => {
        if (Number(n) === 0) return '';
        const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
        const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        
        const numStr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!numStr) return '';
        
        let str = '';
        str += (Number(numStr[1]) !== 0) ? (a[Number(numStr[1])] || b[numStr[1][0]] + ' ' + a[numStr[1][1]]) + 'Crore ' : '';
        str += (Number(numStr[2]) !== 0) ? (a[Number(numStr[2])] || b[numStr[2][0]] + ' ' + a[numStr[2][1]]) + 'Lakh ' : '';
        str += (Number(numStr[3]) !== 0) ? (a[Number(numStr[3])] || b[numStr[3][0]] + ' ' + a[numStr[3][1]]) + 'Thousand ' : '';
        str += (Number(numStr[4]) !== 0) ? (a[Number(numStr[4])] || b[numStr[4][0]] + ' ' + a[numStr[4][1]]) + 'Hundred ' : '';
        str += (Number(numStr[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(numStr[5])] || b[numStr[5][0]] + ' ' + a[numStr[5][1]]) : '';
        return str.trim();
    };

    let output = convert(rupees);
    
    // Append Paise if greater than 0
    if (Number(paise) > 0) {
        // If Rupees part exists, add 'and'
        if (output) output += ' and ';
        output += convert(paise) + ' Paise';
    }
    
    return output + ' Only';
  }

  if (!invoice || !company || !customer) return <div>Loading Invoice...</div>
  const showGst = invoice.is_gst_bill !== false;

  return (
    <div className="print-container">
      {/* INLINE CSS FOR PRINTING */}
      <style jsx global>{`
        /* 1. SCREEN STYLES (What you see on the computer) */
        .action-bar {
          padding: 20px;
          background: #eee;
          margin-bottom: 20px;
          text-align: center;
          display: flex;       /* This handles the alignment */
          justify-content: center;
          gap: 10px;
        }

        /* 2. PRINT STYLES (What happens on paper) */
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          
          /* This forces the button bar to disappear */
          .action-bar { display: none !important; }
        }

        /* 3. YOUR EXISTING INVOICE STYLES */
        .print-container {
          width: 210mm; min-height: 297mm;
          padding: 10mm; margin: 0 auto;
          background: white; color: black;
          font-family: Arial, sans-serif; font-size: 12px;
        }
        .border-box { border: 1px solid black; }
        .flex { display: flex; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { fontWeight: bold; }
        .pad { padding: 4px; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid black; padding: 4px; vertical-align: top; }
        
        .col-sn { width: 30px; }
        .col-desc { width: auto; }
        .col-hsn { width: 80px; }
        .col-qty { width: 80px; }
        .col-rate { width: 80px; }
        .col-per { width: 20px; }
        .col-amount { width: 100px; }
      `}</style>
       <div className="action-bar">
        
        <button 
          onClick={() => router.push('/history')} 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#666', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          &larr; Back to History
        </button>

        <button 
          onClick={() => window.print()} 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          🖨️ Print Invoice
        </button>
      </div>

      {/* --- THE INVOICE DOCUMENT --- */}
      <div className="border-box">
        
        {/* HEADER */}
        <div className="pad" style={{ borderBottom: '1px solid black', position: 'relative', textAlign: 'center', minHeight: '100px' }}>
          
          {/* TOP RIGHT: Date (Pinned Absolutely) */}
          <div style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', textAlign: 'right' }}>
            Dated &nbsp; <strong>{formatDate(invoice.invoice_date)}</strong>
          </div>

          {/* TOP LEFT: Invoice Details (Pinned Absolutely) */}
          <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '10px', textAlign: 'left' }}>
            <div>Invoice No: <strong>{invoice.invoice_number}</strong></div>
            {invoice.reference_number && (
               <div>Ref. No: <strong>{invoice.reference_number}</strong></div>
            )}
          </div>
          
          {/* CENTER: Company Details (Now free to center perfectly) */}
          <div style={{ paddingTop: '5px' }}> {/* Add padding so it doesn't hit the top border */}
            <h3 style={{ margin: '0 0 5px 0', textTransform: 'uppercase' }}><strong>{company.name}</strong></h3>
            
            <div style={{ lineHeight: '1.4', fontSize: '11px' }}>
              {company.address_line_1}<br/>
              {company.address_line_2}<br/>
              {company.city}<br/>
              GSTIN/UIN: {company.gstin}<br/>
              State Name: {company.state}, Code: {company.state_code}<br/>
              Contact: {company.phone}<br/>
              E-Mail: {company.email}
            </div>
          </div>
        </div>

        {/* TITLE & CUSTOMER */}
        <div className="center pad" style={{ borderBottom: '1px solid black', fontWeight: 'bold' }}>
          Tax Invoice
        </div>
        
        {/* CUSTOMER DETAILS (Centered & Detailed) */}
        <div className="center pad" style={{ borderBottom: '1px solid black', lineHeight: '1.5' }}>
          <div>Party : <strong>{customer.company_name}</strong></div>
          
          {/* pre-line ensures the line breaks in the address are shown */}
          <div style={{ whiteSpace: 'pre-line' }}>{customer.address}</div>
          
          <div>GSTIN/UIN: {customer.gstin}</div>
          <div>State Name : {customer.state}, Code : {customer.state_code}</div>
          <div>Place of Supply : {customer.place_of_supply}</div>
          <div>Contact : {customer.phone}</div>
        </div>

        {/* ITEMS TABLE */}
        <table style={{ border: 'none', borderBottom: '1px solid black' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th className="col-sn">SI</th>
              <th className="col-desc">Description of Goods</th>
              {showGst && <th className="col-hsn">HSN/SAC</th>} {/* <--- HIDE IF NO GST */}
              <th className="col-qty">Quantity</th>
              <th className="col-rate">Rate</th>
              <th className="col-per">per</th>
              <th className="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="center" style={{ border: '1px solid black' }}>{idx + 1}</td>
                <td style={{ border: '1px solid black' }}>
                  {/* Main Description (Bold) */}
                  <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                  
                  {/* Subheading (Italic & Indented) - Only shows if text exists */}
                  {item.subheading && (
                    <div style={{ fontStyle: 'italic', fontSize: '11px', paddingLeft: '5px', marginTop: '2px' }}>
                      {item.subheading}
                    </div>
                  )}
                </td>
                {showGst && <td className="center" style={{ border: '1px solid black' }}>{item.hsn_sac_code}</td>}
                <td className="center" style={{ border: '1px solid black' }}>{item.quantity_billed}</td>
                <td className="right" style={{ border: '1px solid black' }}>{item.rate.toFixed(2)}</td>
                <td className="center" style={{ border: '1px solid black' }}>{item.unit}</td>
                <td className="right" style={{ border: '1px solid black' }}><strong>{item.taxable_value.toFixed(2)}</strong></td>
              </tr>
            ))}

            {/* SPACER ROW */}
            <tr style={{ height: '200px' }}>
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
              {showGst && <td style={{ border: '1px solid black' }}></td>} {/* HSN Spacer */}
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
              <td style={{ border: '1px solid black' }}></td>
            </tr>

            {/* CGST ROW */}
            {showGst && (
              <>
                <tr>
                   <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black', textAlign: 'right', fontWeight: 'bold' }}>CGST</td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td className="right" style={{ border: '1px solid black', fontWeight: 'bold' }}>{invoice.total_cgst_amount?.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black', textAlign: 'right', fontWeight: 'bold' }}>SGST</td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td style={{ border: '1px solid black' }}></td>
                   <td className="right" style={{ border: '1px solid black', fontWeight: 'bold' }}>{invoice.total_sgst_amount?.toFixed(2)}</td>
                </tr>
              </>)}
          </tbody>
        </table>

        {/* TOTALS FOOTER */}
        <div className="flex" style={{ borderTop: '1px solid black', borderBottom: '1px solid black' }}>
          
          {/* LEFT COLUMN: Bank Details & Text */}
          <div style={{ flex: 1, padding: '5px', borderRight: '1px solid black', fontSize: '10px' }}>
             
             {/* 1. Amount in Words */}
             <div style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
               <div>
                 Amount Chargeable (in words) : <br/>
                 <strong>{'INR ' + (invoice.amount_in_words || numberToWords(Math.round(invoice.grand_total)))}</strong>
               </div>
               {showGst && (
                <>
                  {/* Tax Amount in Words */}
                  <div style={{ marginTop: '5px' }}>
                    Tax Amount (in words) : <br/>
                    <strong>INR {numberToWords(invoice.total_cgst_amount + invoice.total_sgst_amount)}</strong>
                  </div>
                </>
               )}
             </div>

             {/* 2. Bank Details */}
             <div style={{ marginBottom: '10px' }}>
               <strong style={{ textDecoration: 'underline' }}>Company's Bank Details</strong><br/>
               A/c Holder's Name : <strong>METRO DIGITAL PRINTING</strong><br/>
               Bank Name : <strong>FEDERAL BANK - KEEZHILLAM</strong><br/>
               A/c No. : <strong>12220200006054</strong><br/>
               Branch & IFS Code : <strong>KEEZHILLAM, & FDRL0001222</strong><br/>
               SWIFT Code : <strong>FDRLINBBIBD</strong>
             </div>

             
          </div>

          {/* RIGHT COLUMN: Totals & Auth Signatory */}
          <div style={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Totals Table */}
            <div style={{ padding: '5px', borderBottom: '1px solid black' }}>
              {showGst && (
               <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '5px' }}>
                 <span>Taxable Value:</span>
                 <span>{invoice.total_taxable_value?.toFixed(2)}</span>
               </div>
               )}
               {/* HIDE TAX LINES IN FOOTER */}
               {showGst && (
                 <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '5px', borderBottom: '1px solid black' }}>
                   <span>Total Tax:</span>
                   <span>{(invoice.total_cgst_amount + invoice.total_sgst_amount)?.toFixed(2)}</span>
                 </div>
               )}
               
               <div className="flex" style={{ justifyContent: 'space-between', paddingTop: '5px', fontSize: '14px' }}>
                 <strong>Total:</strong>
                 <strong>{invoice.grand_total?.toFixed(2)}</strong>
               </div>
            </div>

            
          </div>

        </div>

        <div className="pad" style={{ fontSize: '10px', marginTop: '10px' }}>
             <strong style={{ textDecoration: 'underline' }}>Declaration</strong><br/>
             We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </div>

        {/* SIGNATURES SECTION (Aligned in one row) */}
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '40px', padding: '10px 20px' }}>
            
            {/* LEFT: Customer Seal */}
            <div style={{ textAlign: 'center' }}>
               Customer's Seal & Signature
            </div>

            {/* RIGHT: Company Signatory */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '30px', fontSize: '10px' }}>For <strong>{company.name}</strong></div>
                <div>Authorized Signatory</div>
            </div>

        </div>
        <div className="center" style={{ fontSize: '10px', marginTop: '20px', paddingBottom: '10px' }}>
           <span style={{ textDecoration: 'underline' }}>This is a Computer Generated Invoice</span>
        </div>

      </div>
    </div>
  )
}