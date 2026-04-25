"use client"

import * as React from "react"
import { z } from "zod"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import { Toast } from "@/components/ui/Toast"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errors, setErrors] = React.useState<{ email?: string | undefined; password?: string | undefined }>({})
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const formatted = result.error.format()
      setErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      })
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      Toast.success("Logged in successfully")
      // Navigation is handled by the root page or router listening to auth state,
      // but we can enforce it here:
      window.location.href = "/chat"
    } catch (err: any) {
      if (err.response?.status === 401) {
        Toast.error("Invalid credentials")
      } else {
        Toast.error("Server is unreachable. Please try again later.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-8 shadow-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-accent-primary">SYNAPSE</h1>
        <p className="mt-2 text-sm text-text-secondary">Sign in to your enterprise assistant</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isLoading}
        />
        
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isLoading}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign In
        </Button>
      </form>
    </Card>
  )
}
