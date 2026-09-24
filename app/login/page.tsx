'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
     
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/producer')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-5"
      >
        <h1 className="text-xl font-semibold text-white text-center">
          ورود پروداسر
        </h1>

        <div className="space-y-2">
          <input
            type="email"
            placeholder="ایمیل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors"
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
    </div>
  )
}