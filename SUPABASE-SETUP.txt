# Fluxo v11 + Supabase

## O que mudou
- login opcional via Supabase Auth
- persistência híbrida: localStorage + Supabase
- carga automática de sessão já autenticada
- rascunho de prestação sincronizado por usuário
- estado principal sincronizado por workspace

## Arquivos novos que você precisa editar
1. `config.js`
2. executar `supabase-schema.sql` no SQL Editor do projeto

## Passo a passo rápido
1. No Supabase, copie a **Project URL** e a **anon/publishable key**.
2. Abra `config.js` e preencha:
   - `supabaseUrl`
   - `supabaseAnonKey`
   - `workspaceId` (ex.: `principal`)
3. No SQL Editor, rode `supabase-schema.sql`.
4. Em **Authentication > Users**, crie pelo menos um usuário de teste.
5. Depois, crie a linha correspondente em `app_profiles` usando o mesmo `id` do usuário Auth.

## Exemplo de insert do perfil
```sql
insert into public.app_profiles (id, email, role, nome, workspace_id, colaborador_id)
values (
  'UUID_DO_USUARIO_AUTH',
  'seuemail@empresa.com',
  'gestor',
  'Marco',
  'principal',
  null
);
```

## Observação importante
Esta versão usa uma linha JSONB em `workspace_state` para acelerar a homologação.
Isso é bom para teste rápido, mas ainda não é o modelo ideal para produção com segurança fina por papel.
O próximo passo profissional é quebrar os dados em tabelas reais (`despesas`, `fluxos`, `prestacoes`, `colaboradores`, etc.).
