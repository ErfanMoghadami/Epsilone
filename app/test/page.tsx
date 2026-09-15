import { createClient } from '@/lib/supabase/server'

export default async function TestPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getSession()

  return (
    <div>
      <h1>تست اتصال Supabase</h1>
      {error ? (
        <p style={{ color: 'red' }}>خطا: {error.message}</p>
      ) : (
        <p style={{ color: 'green' }}>✅ اتصال برقراره</p>
      )}
    </div>
  )
}