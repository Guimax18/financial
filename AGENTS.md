# Guia de Continuidade para Agentes de Desenvolvimento — Nosso Controle

Este documento foi elaborado para garantir a continuidade transparente do desenvolvimento em qualquer ambiente ou agente de IA (Antigravity, ChatGPT Work, Cursor ou humano).

---

## 🧭 Visão do Projeto e Estado Atual

- **Fase**: Fase 1 (Autenticação, Isolamento Multi-Tenant, Espaços e Convites Seguros).
- **Diretório Raiz da Aplicação**: `nosso-controle/` (onde se encontram `package.json`, `app/`, `src/`, `supabase/`).
- **Estado de Build**: `npm run build` executando com **código 0** (todos os tipos TypeScript e páginas estáticas validados com sucesso).

---

## 🗄 Modelo de Dados e Migrations

A migration atualizada e revisada está em:
👉 `supabase/migrations/20261014_init_security.sql`

### Entidades Implementadas:
1. `profiles`: dados de perfil (vínculo com `auth.users`).
2. `spaces`: ambientes de controle (`personal` ou `family`).
3. `space_members`: tabela de junção com papéis (`owner`, `admin`, `member`).
4. `space_invitations`: convites por hash SHA-256 único, expiração de 48h e validação de e-mail.

### Funções PostgreSQL Implementadas:
- `is_space_member(uuid, uuid)`: Verificação estável sem causar recursão RLS.
- `is_space_manager(uuid, uuid)`: Verificação de privilégios de gestão.
- `is_space_owner(uuid, uuid)`: Verificação de posse.
- `create_space_with_owner(text, text)`: `SECURITY DEFINER` que cria o espaço e insere o membro proprietário de maneira 100% atômica utilizando `auth.uid()` diretamente no servidor.
- `accept_invitation_secure(text)`: `SECURITY DEFINER` que valida o hash do token, expiração e e-mail autenticado obtido diretamente de `auth.jwt()`.

---

## 🔒 Regras Críticas de Segurança

1. **Nunca utilize chaves de serviço (`service_role`) no frontend.**
2. **Nunca confie em sessões não verificadas no servidor.** Sempre use `supabase.auth.getUser()`.
3. **Não armazene valores monetários como ponto flutuante (`float`).** Nas fases seguintes, use `numeric(12,2)` ou inteiros em centavos.
4. **Não utilize dados fictícios como reais.** Todos os estados vazios do dashboard devem ser reais e informativos.

---

## ⚙️ Conexão com Supabase via CLI Oficial

Para desenvolvedores locais usando a CLI oficial do Supabase:

1. **Login Oficial**:
   ```bash
   npx supabase login
   ```
2. **Vincular Projeto**:
   ```bash
   npx supabase link --project-ref <PROJECT_ID>
   ```
3. **Aplicar Migrations**:
   ```bash
   npx supabase db push
   ```
4. **Gerar Tipos TypeScript Atualizados**:
   ```bash
   npx supabase gen types typescript --linked > src/types/supabase.ts
   ```

---

## 🧪 Roteiro de Testes Manuais & RLS

Antes de avançar para a Fase 2 (Contas e Transações), execute o seguinte teste de isolamento com **3 usuários e 2 espaços**:

1. **Usuário A** cadastra-se e cria um espaço familiar "Família Silva".
2. **Usuário A** gera um convite para o e-mail do **Usuário B**.
3. **Usuário B** faz login e aceita o convite pela rota `/invite?token=...`.
4. Verificar se **Usuário B** consegue ver o espaço "Família Silva", mas NÃO consegue ver o espaço pessoal do **Usuário A**.
5. Verificar se **Usuário B** é bloqueado ao tentar promover seu papel para `owner`.
6. **Usuário C** faz login e tenta consultar diretamente registros do espaço "Família Silva" via API. O banco deve retornar vazio ou 403 devido às políticas RLS `spaces_select_member`.
