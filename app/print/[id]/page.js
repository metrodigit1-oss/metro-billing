'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function PrintPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [company, setCompany] = useState(null) // Metro
  const [customer, setCustomer] = useState(null) // External Party
  const router = useRouter()

  useEffect(() => {
    if (params.id) loadInvoice(params.id)
  }, [params.id])

  async function loadInvoice(id) {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
    if (inv) {
      setInvoice(inv)
      const { data: cust } = await supabase.from('customers').select('*').eq('id', inv.customer_id).single()
      setCustomer(cust)
      const { data: invItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', id)
      setItems(invItems)
      const { data: comp } = await supabase.from('companies').select('*').limit(1).single()
      setCompany(comp)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  }

  function numberToWords(num) {
    if (!num) return '';
    const [rupees, paise] = Number(num).toFixed(2).split('.');
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
    if (Number(paise) > 0) {
        if (output) output += ' and ';
        output += convert(paise) + ' Paise';
    }
    return output + ' Only';
  }

  // Helper for cleanly rendering addresses
  function renderAddress(entity) {
    if (!entity) return null;
    if (entity.address_line_1) {
      return (
        <>
          {entity.address_line_1 && <div>{entity.address_line_1}</div>}
          {entity.address_line_2 && <div>{entity.address_line_2}</div>}
          {entity.city && <div>{entity.city}</div>}
        </>
      );
    } 
    return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2' }}>{entity.address}</div>;
  }

  if (!invoice || !company || !customer) return <div>Loading Invoice...</div>
  const showGst = invoice.is_gst_bill !== false;
  
  // --- TYPE LOGIC ---
  // Any type that IS NOT 'SALE' acts like a Purchase (we are buying)
  const isPurchase = invoice.invoice_type && invoice.invoice_type !== 'SALE';
  
  // If Purchase: Seller is the selected Customer (Client), Buyer is Us (Company)
  // If Sale: Seller is Us (Company), Buyer is selected Customer
  const seller = isPurchase ? customer : company;
  const buyer = isPurchase ? company : customer;

  const sellerName = seller.name || seller.company_name;
  const buyerName = buyer.name || buyer.company_name;

  // Header Title Logic
  let billTitle = '';
  if(invoice.invoice_type === 'PURCHASE') billTitle = 'PURCHASE BILL';
  if(invoice.invoice_type === 'RAW_MATERIALS') billTitle = 'RAW MATERIAL BILL';
  if(invoice.invoice_type === 'MACHINE_MAINTENANCE') billTitle = 'MAINTENANCE BILL';

  return (
    <div className="print-container">
      <style jsx global>{`
        @media print {
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
          }
          .action-bar { display: none !important; }
          
          /* Ensure the table can break across pages */
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }

        .print-container {
          width: 210mm;
          margin: 0 auto;
          background: white;
          color: black;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }

        /* Remove fixed heights and single large borders */
        .invoice-wrapper { 
          border: 1px solid black; 
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        
        th, td { 
          border: 1px solid black; 
          padding: 6px; 
          vertical-align: top; 
        }

        /* Prevent the large spacer row from pushing content too far */
        .spacer-row { height: 50px; } 

        .invoice-items-container {
          min-height: 400px; /* Adjust this value to control the empty space */
          border: 1px solid black;
          border-top: none;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-table td {
          border-right: 1px solid black;
          border-left: 1px solid black;
          padding: 8px;
          height: 25px; /* Standard row height */
        }

        /* Ensure the last row doesn't have a bottom border so the space looks continuous */
        .items-table tr:last-child td {
          border-bottom: none;
        }
      `}</style>
       <div className="action-bar">
        <button onClick={() => router.push('/history')} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#666', color: 'white', border: 'none', borderRadius: '4px' }}>&larr; Back to History</button>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>🖨️ Print Invoice</button>
      </div>

      <div className="border-box">
        <div className="pad" style={{ borderBottom: '1px solid black', position: 'relative', textAlign: 'center', minHeight: '100px' }}>
          <div style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', textAlign: 'right' }}>
            Dated &nbsp; <strong>{formatDate(invoice.invoice_date)}</strong>
          </div>
          <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '10px', textAlign: 'left' }}>
            <div>Invoice No: <strong>{invoice.invoice_number}</strong></div>
            {invoice.reference_number && (<div>Ref. No: <strong>{invoice.reference_number}</strong></div>)}
            <div>Mode: <strong>{invoice.payment_mode || 'CREDIT'}</strong></div>
            <div style={{marginTop: 5, fontWeight: 'bold'}}> {billTitle} </div>
          </div>
          
          {/* HEADER (SELLER) */}
          <div style={{ paddingTop: '5px' }}>
            <h3 style={{ margin: '0 0 5px 0', textTransform: 'uppercase' }}><strong>{sellerName}</strong></h3>
            <div style={{ lineHeight: '1.4', fontSize: '11px', marginTop: '5px' }}>
              {renderAddress(seller)} 
              <div style={{ marginTop: '5px' }}>
                GSTIN/UIN: {seller.gstin}<br/>
                State Name: {seller.state}, Code: {seller.state_code}<br/>
                Contact: {seller.phone}<br/>
                {seller.email && <>E-Mail: {seller.email}</>}
              </div>
            </div>
          </div>
        </div>

        <div className="center pad" style={{ 
            borderBottom: '1px solid black', 
            fontWeight: 'bold', 
            textAlign: 'center', // Force explicit centering
            width: '100%' 
          }}>
            {isPurchase ? 'Bill Details' : 'Tax Invoice'}
          </div>

          {/* PARTY (BUYER) SECTION */}
          <div className="center pad" style={{ 
            borderBottom: '1px solid black', 
            lineHeight: '1.5',
            textAlign: 'center', // Force explicit centering
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center' // Ensures inner divs center if they use flex
          }}>
            <div style={{ width: '100%' }}>
              {isPurchase ? 'Billed To (Us):' : 'Party :'} <strong>{buyerName}</strong>
            </div>
            <div style={{ margin: '5px 0', width: '100%' }}>
              {renderAddress(buyer)}
            </div>
            <div style={{ width: '100%' }}>GSTIN/UIN: {buyer.gstin}</div>
            <div style={{ width: '100%' }}>State Name : {buyer.state}, Code : {buyer.state_code}</div>
            <div style={{ width: '100%' }}>Place of Supply : {buyer.place_of_supply || 'Kerala'}</div>
            <div style={{ width: '100%' }}>Contact : {buyer.phone}</div>
        </div>
        <div className='invoice-wrapper'>
        <table style={{ border: 'none', borderBottom: '1px solid black' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th className="col-sn">SI</th>
              <th className="col-desc">Description of Goods</th>
              {showGst && <th className="col-hsn">HSN/SAC</th>}
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
                  <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                  {item.subheading && (<div style={{ fontStyle: 'italic', fontSize: '11px', paddingLeft: '5px', marginTop: '2px' }}>{item.subheading}</div>)}
                </td>
                {showGst && <td className="center" style={{ border: '1px solid black' }}>{item.hsn_sac_code}</td>}
                <td className="center" style={{ border: '1px solid black' }}>{item.quantity_billed}</td>
                <td className="right" style={{ border: '1px solid black' }}>{item.rate.toFixed(2)}</td>
                <td className="center" style={{ border: '1px solid black' }}>{item.unit}</td>
                <td className="right" style={{ border: '1px solid black' }}><strong>{item.taxable_value.toFixed(2)}</strong></td>
              </tr>
            ))}

            {/* DYNAMIC EMPTY ROWS to fill space */}
            {Array.from({ length: Math.max(0, 14 - items.length) }).map((_, index) => {
              // Style: Keep Left/Right borders, remove Top/Bottom to make it look like continuous vertical lines
              const emptyCellStyle = { 
                borderLeft: '1px solid black', 
                borderRight: '1px solid black', 
                borderTop: 'none', 
                borderBottom: 'none', 
                height: '28px' 
              };

              return (
                <tr key={`empty-${index}`}>
                  <td style={emptyCellStyle}></td>
                  <td style={emptyCellStyle}></td>
                  {showGst && <td style={emptyCellStyle}></td>}
                  <td style={emptyCellStyle}></td>
                  <td style={emptyCellStyle}></td>
                  <td style={emptyCellStyle}></td>
                  <td style={emptyCellStyle}></td>
                </tr>
              );
            })}

            {/* Tax Rows - Removed bottom borders for cells */}
            {showGst && (
              <>
                <tr>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none', textAlign: 'right', fontWeight: 'bold' }}>CGST</td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td className="right" style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderTop: '1px solid black', borderBottom: 'none', fontWeight: 'bold' }}>{invoice.total_cgst_amount?.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none', textAlign: 'right', fontWeight: 'bold' }}>SGST</td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none' }}></td>
                    <td className="right" style={{ borderLeft: '1px solid black', borderRight: '1px solid black', borderBottom: 'none', fontWeight: 'bold' }}>{invoice.total_sgst_amount?.toFixed(2)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        

        {/* TOTALS FOOTER */}
        <div style={{ pageBreakInside: 'avoid' }}>
        <div className="flex" style={{ borderTop: '1px solid black', borderBottom: '1px solid black' }}>
          <div style={{ flex: 1, padding: '5px', borderRight: '1px solid black', fontSize: '10px' }}>
             <div style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
               <div>Amount Chargeable (in words) : <br/><strong>{'INR ' + (invoice.amount_in_words || numberToWords(Math.round(invoice.grand_total)))}</strong></div>
               {showGst && (<div style={{ marginTop: '5px' }}>Tax Amount (in words) : <br/><strong>INR {numberToWords(invoice.total_cgst_amount + invoice.total_sgst_amount)}</strong></div>)}
             </div>
             {/* Only show bank details if we are the seller (Sale Mode) */}
             {!isPurchase && (
               <div style={{ marginBottom: '10px' }}>
                 <strong style={{ textDecoration: 'underline' }}>Company's Bank Details</strong><br/>
                 A/c Holder's Name : <strong>{company.name}</strong><br/>
                 Bank Name : <strong>FEDERAL BANK - KEEZHILLAM</strong><br/>
                 A/c No. : <strong>12220200006054</strong><br/>
                 Branch & IFS Code : <strong>KEEZHILLAM, & FDRL0001222</strong><br/>
                 SWIFT Code : <strong>FDRLINBBIBD</strong>
               </div>
             )}
          </div>
          <div style={{ width: '250px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '5px', borderBottom: '1px solid black' }}>
              {showGst && (
               <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '5px' }}>
                 <span>Taxable Value:</span><span>{invoice.total_taxable_value?.toFixed(2)}</span>
               </div>
               )}
               {showGst && (
                 <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '5px', borderBottom: '1px solid black' }}>
                   <span>Total Tax:</span><span>{(invoice.total_cgst_amount + invoice.total_sgst_amount)?.toFixed(2)}</span>
                 </div>
               )}
               <div className="flex" style={{ justifyContent: 'space-between', paddingTop: '5px', fontSize: '14px' }}>
                 <strong>Total:</strong><strong>{invoice.grand_total?.toFixed(2)}</strong>
               </div>
            </div>
          </div>
        </div>
        </div>
        </div>

        <div className="pad" style={{ fontSize: '10px', marginTop: '10px' }}>
             <strong style={{ textDecoration: 'underline' }}>Declaration</strong><br/>
             We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </div>

        {/* SIGNATURES */}
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '40px', padding: '10px 20px' }}>
            <div style={{ textAlign: 'center' }}>
               {isPurchase ? "Supplier's Seal & Signature" : "Customer's Seal & Signature"}
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '30px', fontSize: '10px' }}>For <strong>{company.name}</strong></div>
                <div>Authorized Signatory</div>
            </div>
        </div>
        <div className="center" style={{ 
          fontSize: '10px', 
          marginTop: '20px', 
          paddingBottom: '10px',
          textAlign: 'center', // Explicitly center the text alignment
          width: '100%',       // Ensure the div spans the full width of the border-box
          display: 'block'     // Ensure it behaves as a block-level element
        }}>
          <span style={{ textDecoration: 'underline' }}>This is a Computer Generated Invoice</span>
        </div>
      </div>
    </div>
  )
}