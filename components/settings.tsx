"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Settings, Eye, EyeOff, Lock } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  
  const supabase = createClient()
  const { toast } = useToast()
  const { user } = useAuth()

  const handlePasswordUpdate = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your password",
        variant: "destructive",
      })
      return
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    if (currentPassword === newPassword) {
      toast({
        title: "Error",
        description: "New password must be different from current password",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)

    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      })

      if (signInError) {
        toast({
          title: "Error",
          description: "Current password is incorrect",
          variant: "destructive",
        })
        return
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        toast({
          title: "Error",
          description: updateError.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Password updated successfully",
      })

      // Clear form
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setConfirmOpen(false)
    } catch (error) {
      console.error("Password update error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const resetForm = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setConfirmOpen(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <div>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences and security</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Update Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Change Password</h3>
            </div>
            
            <div className="grid gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    disabled={isUpdating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    disabled={isUpdating}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    disabled={isUpdating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={isUpdating}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    disabled={isUpdating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isUpdating}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword}
                className="w-fit"
              >
                {isUpdating ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>

          {/* Security Information */}
          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h4 className="font-semibold mb-2">Password Requirements</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Password must be at least 6 characters long</li>
              <li>• New password must be different from current password</li>
              <li>• Use a combination of letters, numbers, and symbols for better security</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Password?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to update your password? You will need to use your new password for future logins.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetForm}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePasswordUpdate}
              disabled={isUpdating}
              className="bg-primary hover:bg-primary/90"
            >
              {isUpdating ? "Updating..." : "Update Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
