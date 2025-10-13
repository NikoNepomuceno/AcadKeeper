export interface InventoryItem {
  id: string
  item_name: string
  category: string
  quantity: number
  unit: string
  minimum_stock: number
  location: string | null
  notes: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface InventoryLog {
  id: string
  inventory_id: string | null
  action_type: string
  item_name: string
  previous_quantity: number | null
  new_quantity: number | null
  quantity_change: number | null
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  notes: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  role: "superAdmin" | "admin" | "staff"
  created_at: string
  updated_at: string
}

export type UserRole = "superAdmin" | "admin" | "staff"

export interface StockoutRequest {
  id: string
  inventory_id: string
  requested_by: string
  quantity: number
  notes: string | null
  status: "pending" | "approved" | "denied"
  approved_by: string | null
  decision_notes: string | null
  created_at: string
  updated_at: string
}
