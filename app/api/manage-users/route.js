import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client with Admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  const { action, email, password, userId } = await req.json()

  // 1. CREATE USER
  if (action === 'create') {
    const { email, password, username, role } = await req.json() // <--- Get username & role

    // A. Create Auth User (Supabase handles this)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // B. IMMEDIATELY Update Profile with Username and Role
    // (The profile row was auto-created by the SQL Trigger, we just update it)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ username: username, role: role || 'user' })
        .eq('id', data.user.id)

    if (profileError) return NextResponse.json({ error: 'User created but profile failed: ' + profileError.message }, { status: 400 })

    return NextResponse.json({ message: 'User created', user: data.user })
  }

  // 2. DELETE USER
  if (action === 'delete') {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ message: 'User deleted' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}