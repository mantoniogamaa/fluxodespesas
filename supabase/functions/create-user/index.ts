import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verificar quem está chamando
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se é gestor ou admin
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('usuarios')
      .select('role, empresa_id')
      .eq('id', caller.id)
      .single()

    if (profileErr || !callerProfile || !['gestor', 'admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissão para criar usuários' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email, password, nome, role } = await req.json()

    if (!email || !password || !nome || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, password, nome, role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Criar usuário no Auth
    const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      const msg = authError.message.includes('already') ? 'E-mail já cadastrado' : authError.message
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Inserir perfil na tabela usuarios
    const { error: insertError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: newAuth.user.id,
        email,
        nome,
        role,
        empresa_id: callerProfile.empresa_id,
        ativo: true,
      })

    if (insertError) {
      // Rollback: remover auth user
      await supabaseAdmin.auth.admin.deleteUser(newAuth.user.id)
      return new Response(JSON.stringify({ error: 'Erro ao salvar perfil: ' + insertError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(
      JSON.stringify({ success: true, user: { id: newAuth.user.id, email, nome, role } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
