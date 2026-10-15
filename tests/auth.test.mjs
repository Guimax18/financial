import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { updateSession } from '../src/lib/supabase-middleware.ts';
import { safeRedirect } from '../src/lib/safe-redirect.ts';
import { parseCents } from '../src/lib/money.ts';

test('redirect rejects executable, external, protocol-relative and backslash URLs', () => {
 for (const value of ['javascript:alert(1)','https://evil.test','//evil.test','/\\evil.test','/\nevil.test','']) assert.equal(safeRedirect(value),'/dashboard');
 assert.equal(safeRedirect('/invite?token=abc'),'/invite?token=abc');
});
test('money parsing uses exact integer cents and rejects ambiguous input', () => {
 assert.equal(parseCents('0,29'),29);
 assert.equal(parseCents('1234.56'),123456);
 assert.equal(parseCents('-10,1'),-1010);
 for (const value of ['1.234,56','NaN','1e3','1.999','99999999999','']) assert.throws(()=>parseCents(value));
});
test('SSR validates identity and preserves refreshed cookies on redirects', async () => {
 const before = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test';
 try {
 let calls=0;
 const factory = (user) => (_url,_key,options) => ({ auth: {
  getUser: async () => { calls++; options.cookies.setAll([{name:'session',value:'renewed',options:{httpOnly:true,path:'/'}}]); return {data:{user}}; },
  getSession: () => { throw new Error('Unverified session must never authorize'); },
 } });
 const request = new NextRequest('https://app.test/dashboard?month=2026-10');
 const denied=await updateSession(request,factory(null));
 assert.equal(denied.status,307);
 assert.equal(new URL(denied.headers.get('location')).searchParams.get('redirectTo'),'/dashboard?month=2026-10');
 assert.equal(denied.cookies.get('session').value,'renewed');
 const admitted=await updateSession(new NextRequest('https://app.test/dashboard'),factory({id:'a'}));
 assert.equal(admitted.status,200);
 assert.equal(admitted.cookies.get('session').value,'renewed');
 const login=await updateSession(new NextRequest('https://app.test/login'),factory({id:'a'}));
 assert.equal(login.headers.get('location'),'https://app.test/dashboard');
 assert.equal(login.cookies.get('session').value,'renewed');
 assert.equal(calls,3);
 delete process.env.NEXT_PUBLIC_SUPABASE_URL;
 assert.equal((await updateSession(request,factory(null))).status,503);
 } finally {
  if (before.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL=before.url;
  if (before.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=before.key;
 }
});
