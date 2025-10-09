"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { InventoryItem } from "@/types/inventory"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, AlertTriangle, TrendingUp, Archive } from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CATEGORIES } from "@/lib/constants"

type TimeRange = "day" | "week" | "month" | "year"

export function DashboardStats() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("month")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchItems()
  }, [timeRange])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase.from("inventory").select("*")

    if (error) {
      console.error("[v0] Error fetching items:", error)
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  const totalItems = items.filter((item) => !item.is_archived).length
  const lowStockItems = items.filter((item) => !item.is_archived && item.quantity <= item.minimum_stock).length
  const outOfStockItems = items.filter((item) => !item.is_archived && item.quantity === 0).length
  const archivedItems = items.filter((item) => item.is_archived).length
  const totalValue = items.filter((item) => !item.is_archived).reduce((sum, item) => sum + item.quantity, 0)

  const stats = [
    {
      title: "Total Items",
      value: totalItems,
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Low Stock Alerts",
      value: lowStockItems,
      icon: AlertTriangle,
      color: "text-orange-600",
    },
    {
      title: "Out of Stock",
      value: outOfStockItems,
      icon: TrendingUp,
      color: "text-red-600",
    },
    {
      title: "Archived Items",
      value: archivedItems,
      icon: Archive,
      color: "text-gray-600",
    },
  ]

  const categoryData = CATEGORIES.map((category) => {
    const categoryItems = items.filter((item) => !item.is_archived && item.category === category)
    return {
      category,
      count: categoryItems.length,
      totalQuantity: categoryItems.reduce((sum, item) => sum + item.quantity, 0),
    }
  }).filter((data) => data.count > 0)

  const stockStatusData = [
    {
      name: "In Stock",
      value: items.filter((item) => !item.is_archived && item.quantity > item.minimum_stock * 1.5).length,
      color: "hsl(142, 76%, 36%)",
    },
    {
      name: "Running Low",
      value: items.filter(
        (item) => !item.is_archived && item.quantity > item.minimum_stock && item.quantity <= item.minimum_stock * 1.5,
      ).length,
      color: "hsl(25, 95%, 53%)",
    },
    {
      name: "Low Stock",
      value: items.filter((item) => !item.is_archived && item.quantity > 0 && item.quantity <= item.minimum_stock)
        .length,
      color: "hsl(0, 84%, 60%)",
    },
    {
      name: "Out of Stock",
      value: items.filter((item) => !item.is_archived && item.quantity === 0).length,
      color: "hsl(0, 72%, 51%)",
    },
  ].filter((data) => data.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={cn("h-4 w-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: "Items",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {stockStatusData.length > 0 ? (
              <ChartContainer
                config={{
                  value: {
                    label: "Items",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stockStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Quantity by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ChartContainer
                config={{
                  totalQuantity: {
                    label: "Total Units",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="totalQuantity"
                      stroke="var(--color-totalQuantity)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Stock Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{loading ? "..." : totalValue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-2">Total units across all items</p>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Items:</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average per Item:</span>
                <span className="font-medium">{totalItems > 0 ? Math.round(totalValue / totalItems) : 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Categories:</span>
                <span className="font-medium">{categoryData.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
