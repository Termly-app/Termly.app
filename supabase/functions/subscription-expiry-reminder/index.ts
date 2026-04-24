import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Only allow platform admins to run this
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Response("Unauthorized", { status: 401 })

    const { data: adminCheck } = await supabaseClient
      .from('platform_admins')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!adminCheck) throw new Response("Forbidden", { status: 403 })

    // Find schools expiring in 7 days
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekISO = nextWeek.toISOString().slice(0, 10)

    const { data: expiringProfiles, error: fetchError } = await supabaseClient
      .from('school_profiles')
      .select('school_id, school_name, subscription_expiry, schools(email, phone)')
      .lt('subscription_expiry', nextWeek.toISOString())
      .gt('subscription_expiry', new Date().toISOString())

    if (fetchError) throw fetchError

    // Mock sending email/SMS (Integrate Resend/AT here in production)
    const notifications = expiringProfiles.map(p => ({
      school_id: p.school_id,
      message: `Reminder: Subscription for ${p.school_name} expires on ${p.subscription_expiry.split('T')[0]}.`,
      type: 'Billing'
    }))

    if (notifications.length > 0) {
      // Log to database or send actual emails
      console.log(`Sending ${notifications.length} expiry reminders.`)
    }

    return new Response(JSON.stringify({ success: true, count: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
