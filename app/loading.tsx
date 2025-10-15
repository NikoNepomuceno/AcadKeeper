import { Spinner } from "@/components/ui/shadcn-io/spinner"

export default function Loading() {
  return (
    <div className="min-h-screen grid place-items-center animate-in fade-in-50 duration-200">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="text-primary" size={48} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  )
}


