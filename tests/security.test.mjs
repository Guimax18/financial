import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';
async function setup() {
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated;
 create schema auth;
 create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema public, auth to anon, authenticated;
 grant execute on all functions in schema auth to anon, authenticated;
 insert into auth.users values ('${A}','a@example.test',now()),('${B}','b@example.test',now()),('${C}','c@example.test',null);`);
 for (const name of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()) await db.exec(await readFile(`supabase/migrations/${name}`,'utf8'));
 return db;
}
async function as(db,id,sql) {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id || '']);
 await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
 return db.query(sql);
}
const scalar = result => Object.values(result.rows[0])[0];
test('RLS: three users, invitations and immutable ownership', async () => {
 const db = await setup();
 try {
 const family = scalar(await as(db,A,"select public.create_space_with_owner('Família','family')"));
 const personal = scalar(await as(db,A,"select public.create_space_with_owner('Pessoal','personal')"));
 await as(db,A,`insert into public.profiles(id,full_name) values('${A}','Pessoa A') on conflict(id) do nothing`);
 await as(db,A,`insert into public.profiles(id,full_name) values('${A}','Pessoa A') on conflict(id) do nothing`);
 await as(db,A,`update public.profiles set full_name='Pessoa atualizada' where id='${A}'`);
 assert.equal((await as(db,B,'select * from public.profiles')).rows.length,0);
 await assert.rejects(as(db,B,`insert into public.profiles(id,full_name) values('${C}','Pessoa C')`),/policy/i);
 await assert.rejects(as(db,A,"select public.create_space_with_owner('Duplicado','personal')"),/unique/i);
 await assert.rejects(as(db,A,"select public.create_space_with_owner(' ','family')"),/inválido/i);
 assert.equal((await as(db,C,'select * from public.spaces')).rows.length,0);
 await assert.rejects(as(db,C,`insert into public.space_members(space_id,user_id,role) values('${family}','${C}','owner')`),/permission|policy/i);
 await assert.rejects(as(db,A,`update public.spaces set type='family' where id='${personal}'`),/permission/i);
 await assert.rejects(as(db,A,`insert into public.space_invitations(space_id,email,token_hash,expires_at) values('${personal}','b@example.test','${'a'.repeat(64)}',now()+interval '1 hour')`),/policy/i);
 await as(db,A,`insert into public.space_invitations(space_id,email,token_hash,expires_at) values('${family}','b@example.test','${'b'.repeat(64)}',now()+interval '1 hour')`);
 await assert.rejects(as(db,A,`select public.accept_invitation_secure('${'b'.repeat(64)}')`),/outro e-mail/i);
 await assert.rejects(as(db,C,`select public.accept_invitation_secure('${'b'.repeat(64)}')`),/Confirme/i);
 assert.equal(scalar(await as(db,B,`select public.accept_invitation_secure('${'b'.repeat(64)}')`)),family);
 await assert.rejects(as(db,B,`select public.accept_invitation_secure('${'b'.repeat(64)}')`),/inválido/i);
 assert.deepEqual((await as(db,B,'select id from public.spaces')).rows.map(r=>r.id),[family]);
 await assert.rejects(as(db,B,`update public.space_members set role='owner' where user_id='${B}'`),/permission/i);
 assert.equal(scalar(await as(db,C,`select public.is_space_member('${family}','${A}')`)),false);
 await assert.rejects(as(db,null,"select public.create_space_with_owner('Anon','family')"),/permission/i);
 assert.equal((await as(db,null,'select * from public.spaces').catch(()=>({rows:[]}))).rows.length,0);
 await as(db,A,`delete from public.space_members where space_id='${family}' and user_id='${A}'`);
 assert.equal((await as(db,A,`select * from public.space_members where user_id='${A}' and space_id='${family}'`)).rows.length,1);
 await db.exec('reset role');
 await db.exec(`update public.space_invitations set status='pending', expires_at=now()-interval '1 second',created_at=now()-interval '2 hours' where token_hash='${'b'.repeat(64)}'`);
 await assert.rejects(as(db,B,`select public.accept_invitation_secure('${'b'.repeat(64)}')`),/inválido/i);
 } finally { await db.close(); }
});
test('finance: tenant foreign keys, exact balances, transfers, cards, debts, forecasts', async () => {
 const db = await setup();
 try {
 const shared = scalar(await as(db,A,"select public.create_space_with_owner('Compartilhado','family')"));
 const privateSpace = scalar(await as(db,C,"select public.create_space_with_owner('Privado','personal')"));
 const one = scalar(await as(db,A,`insert into public.accounts(space_id,name,opening_cents) values('${shared}','Banco',10000) returning id`));
 const two = scalar(await as(db,A,`insert into public.accounts(space_id,name) values('${shared}','Carteira') returning id`));
 const foreign = scalar(await as(db,C,`insert into public.accounts(space_id,name) values('${privateSpace}','Segredo') returning id`));
 const category = scalar(await as(db,A,`insert into public.categories(space_id,name,kind) values('${shared}','Comida','expense') returning id`));
 const card = scalar(await as(db,A,`insert into public.cards(space_id,name,limit_cents,closing_day,due_day) values('${shared}','Cartão',100000,20,28) returning id`));
 const debt = scalar(await as(db,A,`insert into public.debts(space_id,name,principal_cents,due_date) values('${shared}','Empréstimo',50000,current_date+10) returning id`));
 const add = (kind,amount,fields='',values='',when='current_date',status='posted',space=shared,actor=A,key='gen_random_uuid()') => as(db,actor,`insert into public.transactions(space_id,request_key,description,kind,amount_cents,occurred_on,status${fields}) values('${space}',${key},'Teste','${kind}',${amount},${when},'${status}'${values}) returning id`);
 await add('income',2500,',account_id',`,'${one}'`);
 await add('expense',1234,',account_id,category_id',`,'${one}','${category}'`);
 const transfer = scalar(await add('transfer',3000,',account_id,to_account_id',`,'${one}','${two}'`));
 let balances=(await as(db,A,'select id,balance_cents from public.account_balances')).rows;
 assert.equal(Number(balances.find(r=>r.id===one).balance_cents),8266);
 assert.equal(Number(balances.find(r=>r.id===two).balance_cents),3000);
 await add('expense',4000,',card_id',`,'${card}'`);
 await add('card_payment',1500,',account_id,card_id',`,'${one}','${card}'`);
 await add('debt_payment',2000,',account_id,debt_id',`,'${one}','${debt}'`);
 assert.equal(Number(scalar(await as(db,A,'select owed_cents from public.card_balances'))),2500);
 assert.equal(Number(scalar(await as(db,A,'select remaining_cents from public.debt_balances'))),48000);
 await assert.rejects(add('debt_payment',48001,',account_id,debt_id',`,'${one}','${debt}'`),/excede/i);
 await add('income',800,',account_id',`,'${one}'`,'current_date+10','pending');
 await add('expense',300,',account_id',`,'${one}'`,'current_date-2','pending');
 await add('income',999,',account_id',`,'${one}'`,'current_date+31','pending');
 const summary=scalar(await as(db,A,`select public.finance_summary('${shared}',current_date)`));
 assert.equal(summary.balance_cents,7766);
 assert.equal(summary.income_cents,2500);
 assert.equal(summary.expense_cents,7234);
 assert.equal(summary.pending_cash_cents,500);
 assert.equal((await as(db,C,`select * from public.account_balances where space_id='${shared}'`)).rows.length,0);
 assert.equal(scalar(await as(db,C,`select public.finance_summary('${shared}',current_date)`)).balance_cents,0);
 await assert.rejects(add('transfer',100,',account_id,to_account_id',`,'${one}','${foreign}'`),/foreign key/i);
 await assert.rejects(add('income',100,',account_id',`,'${foreign}'`),/foreign key/i);
 await assert.rejects(add('income',100,',account_id,category_id',`,'${one}','${category}'`),/incompatível/i);
 await assert.rejects(add('income',0,',account_id',`,'${one}'`),/check/i);
 await assert.rejects(add('income',100,',account_id,created_by',`,'${one}','${B}'`),/policy/i);
 await assert.rejects(add('income',100,',account_id',`,'${one}'`,'current_date','posted',shared,C),/policy/i);
 await assert.rejects(add('income',100,',account_id',`,'${one}'`,'current_date+1'),/futuro/i);
 const key="'00000000-0000-4000-8000-000000000009'";
 await add('income',100,',account_id',`,'${one}'`,'current_date','posted',shared,A,key);
 await assert.rejects(add('income',100,',account_id',`,'${one}'`,'current_date','posted',shared,A,key),/unique/i);
 await as(db,A,`update public.transactions set status='cancelled' where id='${transfer}'`);
 balances=(await as(db,A,'select id,balance_cents from public.account_balances')).rows;
 assert.equal(Number(balances.find(r=>r.id===two).balance_cents),0);
 await assert.rejects(as(db,A,`update public.transactions set amount_cents=999 where id='${transfer}'`),/permission/i);
 await assert.rejects(as(db,C,`insert into public.accounts(space_id,name) values('${shared}','Invasão')`),/policy/i);
 // A legitimate second member can collaborate only in the shared space.
 await as(db,A,`insert into public.space_invitations(space_id,email,token_hash,expires_at) values('${shared}','b@example.test','${'d'.repeat(64)}',now()+interval '1 hour')`);
 await as(db,B,`select public.accept_invitation_secure('${'d'.repeat(64)}')`);
 await add('income',77,',account_id',`,'${one}'`,'current_date','posted',shared,B);
 assert.equal((await as(db,B,'select * from public.accounts')).rows.length,2);
 assert.equal((await as(db,B,`update public.transactions set status='cancelled' where space_id='${privateSpace}' returning id`)).rows.length,0);
 await assert.rejects(as(db,B,`insert into public.space_invitations(space_id,email,token_hash,expires_at) values('${shared}','c@example.test','${'e'.repeat(64)}',now()+interval '1 hour')`),/policy/i);
 } finally { await db.close(); }
});
