# Verificação direta no Supabase — 15/10/2026

## Acesso e escopo

Projeto `finance`, ref `arfukhaeizkbrkmtfdyl`. A conferência foi feita pelo navegador do Codex, após o usuário entrar pessoalmente no Supabase. Não foram lidos segredos, e-mails ou dados financeiros para elaborar este registro. O terminal desta sessão não conseguiu acessar os serviços externos pela rede.

## Histórico observado

| Versão remota | Nome registrado | SQL exibido no histórico |
| --- | --- | --- |
| 20261016010452 | 20261014_init_security | DDL com cabeçalho e conteúdo diferentes do arquivo local; não se afirmou identidade integral |
| 20261016010500 | 20261015_security_hardening | `-- security hardening applied;` |
| 20261016010600 | 20261016_finance_mvp | `-- finance mvp applied;` |
| 20261016023052 | read_only_balance_views | SQL completo da nova migration, registrado nesta continuação |

As três primeiras entradas já existiam. A última foi aplicada somente após teste local. Nenhum registro antigo foi alterado. Arquivos locais receberam os prefixos correspondentes às versões reais; essa alteração evita que a CLI trate as antigas versões curtas como novas migrations pendentes. Ela não transforma o SQL histórico antigo em uma cópia integral dos arquivos locais.

## Condições verificadas no banco real

As consultas de `supabase/checks/security.sql` retornaram `true` nas 13 linhas:

1. RLS ativada nas nove tabelas da aplicação.
2. Ausência de SELECT anônimo nas tabelas base.
3. INSERT/UPDATE direto de membros não permitido ao papel authenticated.
4. INSERT direto de espaços não permitido.
5. Proprietário e tipo do espaço sem permissão de UPDATE pela API.
6. As três views de saldos com security_invoker.
7. Índice único de espaço pessoal presente.
8. Função de aceite contendo a validação de confirmação do e-mail.
9. Cinco chaves estrangeiras compostas em transactions.
10. Validação de dívida contendo bloqueio de linha.
11. finance_summary configurada como security invoker.
12. Prazo de convite com valor padrão no servidor.
13. As três views limitadas a SELECT para authenticated.

Também foram consultadas as sete funções: search_path vazio, funções de espaço/convite/helpers como SECURITY DEFINER, finance_summary/validate_transaction como invoker e sem EXECUTE anônimo. Essas observações de catálogo não são testes comportamentais completos de cada função.

## Correção aplicada

As views tinham privilégios padrão do Supabase, incluindo permissões desnecessárias de anon e authenticated. As tabelas base e as views invoker continuavam protegendo os dados, mas os grants não correspondiam ao mínimo necessário.

`20261016023052_read_only_balance_views.sql` revogou os privilégios dessas views de PUBLIC, anon e authenticated e concedeu somente SELECT a authenticated. O serviço administrativo manteve seus privilégios. Não houve alteração de dados, saldos, tabelas ou políticas RLS. O SQL completo e o registro da migration foram gravados na mesma transação e verificados após a execução.

O teste local passou a reproduzir os grants padrão do Supabase, que não eram representados antes. Ele verifica bloqueio anônimo e ausência de permissões de escrita nas três views.

## Autenticação

Site URL observado: `http://localhost:3000`.

Callbacks salvos e confirmados pelo painel:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=**`

O padrão de query é apenas para o desenvolvimento local. Ainda não há URL de produção configurada nesta etapa. SMTP próprio está desativado; não foi habilitado provedor, não foram inseridas credenciais e a confirmação de e-mail não foi desabilitada.

## O que continua pendente

- Cadastro e confirmação por e-mail com uma conta real da aplicação.
- Recuperação de senha e renovação SSR com sessão real.
- Três identidades reais acessando a API PostgREST e aceitando/rejeitando convites.
- Configuração de SMTP próprio, caso necessário para os destinatários e volume de testes pretendidos.
- Publicação da branch no GitHub por um terminal com acesso de rede e autenticação.

Os testes locais usam PostgreSQL/PGlite e clientes simulados para SSR. Eles passaram, mas não devem ser apresentados como três sessões reais do Supabase Auth.
