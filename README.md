# Nosso Controle

MVP financeiro em Next.js 16 + Supabase. Continuidade do projeto do Antigravity, com autenticação e autorização revisadas em 15/10/2026.

## Executar

Use Node.js 24. Copie .env.example para .env.local e configure a URL e a chave pública do projeto pelo ambiente local. Não use service_role nem envie segredos por chat. Nenhum arquivo de credenciais foi transferido da pasta original.

```text
npm ci
npm run dev
```

Configure no Supabase as URLs autorizadas de /auth/callback para cadastro e recuperação de senha. O fluxo usa PKCE e troca o código no servidor. O painel exige usuário validado; ausência de configuração retorna 503.

## Funcionalidades

- Espaço pessoal privado e espaços familiares compartilhados; criação atômica e convites com hash SHA-256, validade de 48h, e-mail confirmado e uso único.
- Contas/carteiras com saldo inicial, categorias de receita/despesa, transações efetivadas e previstas.
- Transferências entre contas do mesmo espaço, representadas em um único registro.
- Compras no cartão, limite disponível e pagamentos; saldo devedor de dívidas e amortização por pagamentos.
- Painel com saldos e movimento do mês; caixa previsto em 30 dias; histórico com filtro e paginação.
- Cancelamento de lançamento sem exclusão física. Correções de valor são feitas por cancelamento e novo lançamento.
- Alternador de espaço no computador e no menu do celular. Formulários limpam o estado ao trocar de espaço.

## Banco e segurança

Leia [a auditoria](docs/SECURITY_AUDIT.md) antes de aplicar SQL. A versão recebida da migration inicial continha entrada indevida em espaços; foi corrigida. A migration adicional também repara instalações da versão antiga.

Ordem: 20261014_init_security.sql → 20261015_security_hardening.sql → 20261016_finance_mvp.sql. Os nomes são versões de ordenação; todos foram preparados nesta etapa. Não há aplicação remota automática. Em instalações existentes, confirme o histórico e aplique somente as migrations pendentes em homologação. Não reexecute a migration inicial já registrada.

O histórico remoto, o esquema e dados atuais precisam ser inspecionados antes de qualquer aplicação. Nenhuma limpeza ou reset é necessária para os testes locais. Use a autenticação oficial da CLI ou um conector autorizado para acesso remoto, nunca credenciais no código.

RLS protege as tabelas financeiras e as views usam security_invoker. Valores são inteiros em centavos. Saldo é derivado do livro de transações, sem atualização no navegador. Papéis de membros não são editáveis diretamente, inclusive por proprietários; não há interface de administração de papéis neste MVP. Proprietários/admins podem emitir convites; membros colaboram nas finanças do espaço a que pertencem.

## Regras financeiras e limites do MVP

Receitas/despesas do mês somam lançamentos efetivados até hoje. Compras no cartão entram em despesas; pagamento do cartão só afeta caixa e passivo, evitando contar a compra duas vezes. Pagamento de dívida entra em despesas e reduz o saldo devedor. Transferências não são receita/despesa e não alteram o caixa consolidado.

A previsão inclui lançamentos pendentes até hoje +30 dias, inclusive atrasados. Contas e dívidas não geram pagamentos previstos automaticamente: cadastre esses compromissos. Não há efetivação automática, recorrência, importação bancária, juros automáticos, parcelamento ou fatura fechada por ciclo. Cartões mostram o saldo agregado e guardam dias de fechamento/vencimento de 1 a 28. Pagamentos acima do saldo da dívida são rejeitados; cartões admitem saldo credor. Transferências entre espaços são bloqueadas.

Moeda única BRL. Cadastro/listas de contas, cartões, categorias e dívidas limitados aos primeiros 1000 registros por espaço; histórico paginado em 25. Totais são agregados no banco e independem da página do histórico. Os tipos TypeScript refletem as migrations locais; regenerar a partir do Supabase após a validação remota.

## Verificar

```text
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:ui
npm audit --omit=dev
```

A suíte de banco usa PostgreSQL via PGlite com três identidades e papéis reais de banco; não exige credenciais ou Docker. O navegador usa uma API local de teste isolada. As diferenças em relação ao Supabase real e os alertas de dependências estão descritos na auditoria.

## Continuidade e Git

Pasta original preservada: C:/Users/guima/Downloads/projeto finanças/nosso-controle.

Cópia de desenvolvimento: C:/Users/guima/Documents/Codex/2026-10-15/referenced-chatgpt-conversation-this-is-an/nosso-controle.

Branch: feat/secure-finance-mvp. O histórico original foi copiado; alterações herdadas foram registradas antes da continuação. O primeiro commit de preservação inclui também os dois arquivos iniciais preparados pela auditoria (safe-redirect e hardening); o commit seguinte reúne a implementação e a validação. Nenhum push ou publicação foi feito.
