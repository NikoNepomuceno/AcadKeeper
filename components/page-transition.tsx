"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-in fade-in-50 duration-300">
      {children}
    </div>
  )
}


