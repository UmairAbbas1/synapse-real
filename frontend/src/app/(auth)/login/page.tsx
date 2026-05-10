"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ApiError } from "@/lib/api-client"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const [banner, setBanner] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/chat")
    }
  }, [authLoading, isAuthenticated, router])

  React.useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 5000)
    return () => window.clearTimeout(t)
  }, [banner])

  const onSubmit = async (data: LoginForm) => {
    setBanner(null)
    try {
      await login(data.email, data.password)
      router.push("/chat")
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setBanner("Invalid email or password.")
      } else {
        setBanner("Could not reach the server. Try again.")
      }
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="font-sans text-4xl font-bold tracking-tight text-accent-primary">SYNAPSE</h1>
        <p className="mt-2 text-sm text-text-secondary">Enterprise Knowledge, Grounded.</p>
      </div>

      <div className="w-full max-w-md rounded-[12px] border border-border-medium bg-bg-secondary p-8">
        {banner ? (
          <div
            className="mb-6 rounded-[6px] border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-status-error"
            role="alert"
          >
            {banner}
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={isSubmitting}
            {...register("password")}
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-xs text-text-tertiary">
        Demo: admin@company.com / Admin123!
      </p>
    </div>
  )
}
