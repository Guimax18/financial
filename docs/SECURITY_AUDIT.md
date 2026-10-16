# Auditoria de segurança — 15/10/2026

## Evidência e correções

O SQL recebido permitia `INSERT` em `space_members` quando `auth.uid() = user_id`, sem exigir convite nem restringir o papel. Um usuário autenticado podia adicionar a si próprio a qualquer espaço conhecido, inclusive como `owner`. A correção foi aplicada ao arquivo inicial e complementada por uma migration de endurecimento para instalações que já tenham executado a versão antiga.

| Achado | Correção |
| --- | --- |
| Entrada em espaços sem convite | Gravações diretas de membros proibidas; entrada apenas por RPC de aceite |
| Alteração e movimentação de membros/proprietário | Sem UPDATE de membros; proprietário não pode sair pela API; UPDATE de espaços limitado ao nome |
| Espaço pessoal compartilhável | Convites e aceite apenas para espaços familiares |
| Corrida na criação de espaço pessoal | Índice parcial único por proprietário |
| Consulta de vínculos de terceiros por RPC | Helpers limitados à identidade autenticada e EXECUTE apenas para authenticated |
| E-mail não confirmado ou claim antiga | Aceite consulta identidade atual e confirmação em auth.users dentro da função privilegiada |
| Prazo de convite controlado pelo relógio do navegador | Prazo padrão de 48h definido pelo banco; limites e formato validados |
| Erro da RPC contornado no navegador | Removidos fallbacks de cadastro de espaços e de aceite |
| Cookies de sessão perdidos em redirect | Cookies atualizados copiados para cada resposta de redirecionamento |
| Redirecionamento fornecido pelo cliente | Apenas caminhos locais; protocolo relativo, controles e barras invertidas recusados |
| Cadastro sem sessão de confirmação | Mensagem de confirmação; fluxo PKCE em /auth/callback; destino do convite preservado |
| IDs financeiros de outro espaço | Chaves estrangeiras compostas com space_id e RLS em todas as tabelas |
| Views burlando RLS | Views com security_invoker=true |
| Valores imprecisos ou transação duplicada | Centavos inteiros, limites e chave de idempotência por espaço |
| Transferência parcialmente gravada | Uma transação representa débito e crédito; saldo calculado por consulta |
| Pagamento acima do saldo da dívida | Trigger com bloqueio de linha e verificação do total efetivado |

## Testes executáveis

`npm test` usa PostgreSQL via PGlite, com usuários A/B/C e papéis anon/authenticated. Auth é representado por um esquema mínimo com auth.uid()/auth.jwt(). Os testes executam as migrations e consultas reais sob RLS, cobrindo isolamento, autorizações, convite de outro e-mail, e-mail não confirmado, expiração, replay, promoção, identidades de autor, referências cruzadas, transferências, cancelamento, cartões, dívidas e previsão. Testes separados exercitam SSR com cliente injetado, cookies e redirecionamentos.

`npm run test:ui` usa Chromium e a aplicação Next real, com uma API local de contrato. Verifica bloqueio anônimo, criação de conta/despesa, larguras 320/768/1024/1440, ausência de transbordamento da página e análise automática axe na tela de previsão. A fixture não substitui testes de autorização do banco e nunca é usada pela aplicação em produção.

## Verificação direta no Supabase

Em 15/10/2026, o projeto finance / arfukhaeizkbrkmtfdyl foi conferido pelo Dashboard autenticado. As 13 condições de supabase/checks/security.sql retornaram true. Isso comprova as condições estruturais consultadas; não substitui login, renovação de sessão, entrega de e-mail e testes com três JWTs reais.

Foram encontrados grants padrão excessivos nas views, mesmo com RLS das tabelas e security_invoker ativos. A migration 20261016023052_read_only_balance_views.sql removeu esses grants de PUBLIC/anon/authenticated, mantendo somente SELECT para authenticated. A gravação da migration e a restrição de permissões ocorreram na mesma transação. O estado final foi consultado novamente.

O histórico remoto anterior de segurança e finanças guarda apenas comentários. O SQL registrado da primeira migration também não é idêntico ao arquivo local. Portanto, a afirmação anterior de conformidade estrita do histórico foi corrigida. Os nomes locais foram alinhados às versões registradas, sem reaplicar nem modificar registros remotos antigos. Consulte docs/REMOTE_VERIFICATION.md para a distinção entre evidência observada e testes pendentes.

Os callbacks locais foram adicionados explicitamente à configuração do Supabase. O SMTP customizado permanece desativado. Não foram alteradas senha, exigência de confirmação de e-mail ou proteções de autenticação.

## Dependências

Consulta de 15/10/2026: `npm audit --omit=dev` retornou zero alertas. A auditoria completa retornou cinco alertas altos na cadeia eslint-config-next → fast-glob → micromatch → braces (GHSA-vfj7-8cjw-p6xm). A versão publicada mais recente de braces era 3.0.3, ainda afetada. Não foi executado `audit fix --force` nem downgrade incompatível do Next. Acompanhar a correção antes de processar padrões não confiáveis nas ferramentas de desenvolvimento.

## Referências consultadas

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Sessões e renovação de cookies](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Convenção Proxy do Next](https://nextjs.org/docs/messages/middleware-to-proxy)
- Guias locais da versão instalada: `next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` e `03-api-reference/04-functions/connection.md`.
