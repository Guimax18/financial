# Nosso Controle 💰

Plataforma SaaS moderna de gestão financeira pessoal e familiar com isolamento multi-tenant seguro e arquitetura em nuvem.

---

## 🛠 Stack Tecnológica

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes**: Design System customizado (Button, Input, Card, Dialog, Skeleton) com padrão shadcn
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 17, Row Level Security, Auth SSR)
- **Validação de Schemas**: [Zod](https://zod.dev/)
- **Sessões e Middleware**: `@supabase/ssr`

---

## 📁 Estrutura de Rotas e Páginas

| Rota | Descrição |
| :--- | :--- |
| `/` | Landing page institucional e apresentação dos recursos |
| `/login` | Autenticação via e-mail e senha com validação de sessão |
| `/signup` | Cadastro de novos usuários e inicialização de perfil |
| `/reset-password` | Solicitação de link seguro para redefinição de senha |
| `/onboarding` | Wizard pós-cadastro para criação atômica dos espaços |
| `/dashboard` | Visão geral consolidada e métricas em estado zero real |
| `/dashboard/spaces` | Gerenciamento de espaços pessoais, familiares e convites |
| `/dashboard/profile` | Edição de perfil pessoal e troca de senha |
| `/invite` | Aceite seguro de convite por token SHA-256 e validação de e-mail |

---

## 🚀 Como Executar Localmente

### 1. Clonar e Instalar Dependências

```bash
cd nosso-controle
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha com as credenciais do seu projeto Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Executar o Servidor de Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### 4. Build de Produção

```bash
npm run build
npm run start
```
