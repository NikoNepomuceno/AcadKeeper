"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useLoading } from "@/components/loading-provider"
import { useRateLimit } from "@/hooks/use-rate-limit"
import { Eye, EyeOff, Clock } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { setIsLoading: setGlobalLoading } = useLoading()
  const { 
    failedAttempts, 
    isBlocked, 
    timeRemaining, 
    blockDuration, 
    recordFailedAttempt, 
    resetRateLimit, 
    canAttempt 
  } = useRateLimit()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is currently blocked
    if (!canAttempt()) {
      toast({
        title: "Too Many Failed Attempts",
        description: `Please wait ${timeRemaining} seconds before trying again.`,
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // After successful auth, verify the account is not suspended
      const userId = signInData.user?.id
      if (userId) {
        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("status")
          .eq("user_id", userId)
          .single()
        if (profileErr) throw profileErr
        if (profile?.status === "Suspended") {
          await supabase.auth.signOut()
          throw new Error("Your account is suspended. Please contact an administrator.")
        }
      }

      // Reset rate limiting on successful login
      resetRateLimit()

      toast({
        title: "Success",
        description: "Logged in successfully!",
      })

      // Show global loading overlay while navigating to dashboard
      setGlobalLoading(true)
      router.push("/")
      router.refresh()
    } catch (error: unknown) {
      // Record failed attempt
      recordFailedAttempt()
      
      const errorMessage = error instanceof Error ? error.message : "Failed to login"
      
      // Show different messages based on failed attempts
      if (failedAttempts + 1 >= 5) {
        const blockTime = failedAttempts + 1 === 5 ? 15 : 30
        toast({
          title: "Too Many Failed Attempts",
          description: `Account temporarily locked for ${blockTime} seconds. Please wait before trying again.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your credentials to access AcadKeeper</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@school.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || isBlocked}
                >
                  {isLoading ? "Logging in..." : isBlocked ? `Wait ${timeRemaining}s` : "Login"}
                </Button>
                
                {/* Rate limiting feedback */}
                {isBlocked && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>
                      Too many failed attempts. Please wait {timeRemaining} seconds before trying again.
                    </span>
                  </div>
                )}
                
                {failedAttempts > 0 && !isBlocked && (
                  <div className="text-center text-sm text-amber-600">
                    Failed attempts: {failedAttempts}/5
                  </div>
                )}
              </div>
              {/* Registration removed: users are created by SuperAdmin */}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
