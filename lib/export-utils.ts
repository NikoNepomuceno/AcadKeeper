import type { InventoryLog } from '@/types/inventory'

// Dynamic imports for client-side only libraries

export interface ExportLogData {
  'Date & Time': string
  'Action': string
  'Item Name': string
  'Previous Quantity': string
  'New Quantity': string
  'Quantity Change': string
  'Notes': string
}

export function formatLogsForExport(logs: InventoryLog[]): ExportLogData[] {
  return logs.map(log => ({
    'Date & Time': new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(log.created_at)),
    'Action': log.action_type.replace('_', ' ').toUpperCase(),
    'Item Name': log.item_name,
    'Previous Quantity': log.previous_quantity?.toString() || '—',
    'New Quantity': log.new_quantity?.toString() || '—',
    'Quantity Change': log.quantity_change?.toString() || '—',
    'Notes': log.notes || '—'
  }))
}

export function exportToCSV(logs: InventoryLog[], filename?: string): void {
  const exportData = formatLogsForExport(logs)
  
  if (exportData.length === 0) {
    alert('No data to export')
    return
  }

  const headers = Object.keys(exportData[0])
  const csvContent = [
    headers.join(','),
    ...exportData.map(row => 
      headers.map(header => {
        const value = row[header as keyof ExportLogData]
        // Escape commas and quotes in CSV
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename || `inventory-logs-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function exportToPDF(logs: InventoryLog[], filename?: string): Promise<void> {
  if (logs.length === 0) {
    alert('No data to export')
    return
  }

  try {
    // Import jsPDF and autoTable together
    const jsPDFModule = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')
    
    const { default: jsPDF } = jsPDFModule
    const autoTable = autoTableModule.default
    
    const exportData = formatLogsForExport(logs)
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(16)
    doc.text('Inventory Activity Log', 14, 22)
    
    // Add export date
    doc.setFontSize(10)
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 30)
    
    // Prepare table data
    const headers = Object.keys(exportData[0])
    const tableData = exportData.map(row => 
      headers.map(header => row[header as keyof ExportLogData])
    )
    
    // Add table using the imported autoTable function
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 }, // Date & Time
        1: { cellWidth: 20 }, // Action
        2: { cellWidth: 30 }, // Item Name
        3: { cellWidth: 20 }, // Previous Quantity
        4: { cellWidth: 20 }, // New Quantity
        5: { cellWidth: 20 }, // Quantity Change
        6: { cellWidth: 35 }  // Notes
      }
    })
    
    // Save the PDF
    doc.save(filename || `inventory-logs-${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('PDF export error:', error)
    alert('PDF export failed. Please try again.')
  }
}

export async function exportToExcel(logs: InventoryLog[], filename?: string): Promise<void> {
  if (logs.length === 0) {
    alert('No data to export')
    return
  }

  try {
    // Import XLSX dynamically
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule

    const exportData = formatLogsForExport(logs)
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // Date & Time
      { wch: 15 }, // Action
      { wch: 25 }, // Item Name
      { wch: 18 }, // Previous Quantity
      { wch: 15 }, // New Quantity
      { wch: 18 }, // Quantity Change
      { wch: 30 }  // Notes
    ]
    ws['!cols'] = colWidths
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Log')
    
    // Save the file
    XLSX.writeFile(wb, filename || `inventory-logs-${new Date().toISOString().split('T')[0]}.xlsx`)
  } catch (error) {
    console.error('Excel export error:', error)
    alert('Excel export failed. Please try again.')
  }
}

export function getExportFilename(format: 'csv' | 'pdf' | 'xlsx', range?: string): string {
  const date = new Date().toISOString().split('T')[0]
  const rangeSuffix = range ? `-${range}` : ''
  return `inventory-logs${rangeSuffix}-${date}.${format}`
}
