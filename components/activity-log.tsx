"use client"

import React from "react"
import type { InventoryLog } from "@/types/inventory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Edit, Archive, TrendingUp, TrendingDown, ArchiveRestore, Download, FileText, FileSpreadsheet, File } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { exportToCSV, exportToPDF, exportToExcel, getExportFilename } from "@/lib/export-utils"

export type LogRange = "day" | "week" | "month" | "year"

export type ActivityLogProps = {
  logs: InventoryLog[]
  range?: LogRange
  onRangeChange?: (range: LogRange) => void
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs, range, onRangeChange }) => {
  async function handleExport(format: 'csv' | 'pdf' | 'xlsx') {
    const filename = getExportFilename(format, range)
    
    try {
      switch (format) {
        case 'csv':
          exportToCSV(logs, filename)
          break
        case 'pdf':
          await exportToPDF(logs, filename)
          break
        case 'xlsx':
          await exportToExcel(logs, filename)
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  function getActionIcon(actionType: string) {
    switch (actionType) {
      case "created":
        return <Plus className="h-4 w-4" />
      case "updated":
        return <Edit className="h-4 w-4" />
      case "archived":
        return <Archive className="h-4 w-4" />
      case "restored":
        return <ArchiveRestore className="h-4 w-4" />
      case "stock_in":
        return <TrendingUp className="h-4 w-4" />
      case "stock_out":
        return <TrendingDown className="h-4 w-4" />
      default:
        return null
    }
  }

  function getActionBadge(actionType: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      created: "default",
      updated: "secondary",
      archived: "outline",
      restored: "outline",
      stock_in: "default",
      stock_out: "destructive",
    }

    return (
      <Badge variant={variants[actionType] || "default"} className="flex items-center gap-1 w-fit">
        {getActionIcon(actionType)}
        {actionType.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  function getLogDescription(log: InventoryLog) {
    switch (log.action_type) {
      case "created":
        return `Added ${log.item_name} with initial quantity of ${log.new_quantity}`
      case "updated":
        return `Updated ${log.item_name} details`
      case "archived":
        return `Archived ${log.item_name}`
      case "restored":
        return `Restored ${log.item_name} from archive`
      case "stock_in":
        return `Added ${log.quantity_change} ${log.item_name} to stock (${log.previous_quantity} → ${log.new_quantity})`
      case "stock_out":
        return `Removed ${Math.abs(log.quantity_change || 0)} ${log.item_name} from stock (${log.previous_quantity} → ${log.new_quantity})`
      default:
        return log.notes || "Activity recorded"
    }
  }

  function formatDaySeparator(dateString: string) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  // Group logs by calendar day; logs are assumed sorted desc by created_at
  const grouped: { label: string; items: InventoryLog[] }[] = []
  let currentLabel: string | null = null
  for (const log of logs) {
    const label = new Date(log.created_at).toDateString()
    if (label !== currentLabel) {
      grouped.push({ label, items: [log] })
      currentLabel = label
    } else {
      grouped[grouped.length - 1].items.push(log)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Activity Log</CardTitle>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <File className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onRangeChange && (
              <Select value={range} onValueChange={(v) => onRangeChange(v as LogRange)}>
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue placeholder="Filter range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No activity recorded yet.</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((group) => (
                    <React.Fragment key={`grp-${group.label}`}>
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted/60 text-muted-foreground font-medium">
                          {formatDaySeparator(group.items[0].created_at)}
                        </TableCell>
                      </TableRow>
                      {group.items.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                          <TableCell>{getActionBadge(log.action_type)}</TableCell>
                          <TableCell>{getLogDescription(log)}</TableCell>
                          <TableCell className="text-muted-foreground">{log.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {grouped.map((group) => (
                <div key={`grp-${group.label}`} className="space-y-3">
                  <div className="bg-muted/60 text-muted-foreground font-medium p-3 rounded-lg">
                    {formatDaySeparator(group.items[0].created_at)}
                  </div>
                  {group.items.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{formatDate(log.created_at)}</span>
                          {getActionBadge(log.action_type)}
                        </div>
                        <p className="text-sm">{getLogDescription(log)}</p>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
