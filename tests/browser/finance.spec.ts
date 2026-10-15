import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const user={id:'00000000-0000-4000-8000-000000000001',email:'a@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{full_name:'Pessoa de teste'},created_at:new Date().toISOString()};
async function authenticate(page: import('@playwright/test').Page) {
 const exp=Math.floor(Date.now()/1000)+3600;
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:user.id,exp,role:'authenticated',email:user.email})).toString('base64url')}.local-test-signature`;
 const session={access_token:jwt,refresh_token:'local-test-refresh',token_type:'bearer',expires_in:3600,expires_at:exp,user};
 await page.context().addCookies([{name:'sb-127-auth-token',value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,url:'http://127.0.0.1:3111'}]);
}
test('anonymous dashboard redirects to login',async({page})=>{
 await page.goto('/dashboard');await expect(page).toHaveURL(/\/login\?redirectTo=/);
});
test('financial forms, responsive sections and accessibility',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await authenticate(page);await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Seu controle financeiro'})).toBeVisible();
 await page.getByRole('button',{name:'Contas',exact:true}).click();
 await page.getByRole('button',{name:'Nova conta',exact:true}).click();
 await page.getByLabel('Nome',{exact:true}).fill('Banco principal');
 await page.getByLabel('Saldo inicial (R$)').fill('100,29');
 await page.getByRole('button',{name:'Salvar cadastro'}).click();
 await expect(page.getByRole('heading',{name:'Banco principal'})).toBeVisible();
 await expect(page.getByText('R$ 100,29',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Movimentações',exact:true}).click();
 await page.getByRole('button',{name:'Nova movimentação',exact:true}).click();
 await page.getByLabel('Descrição',{exact:true}).fill('Almoço');
 await page.getByLabel('Valor (R$)').fill('10,29');
 await page.getByLabel('Conta',{exact:true}).selectOption({label:'Banco principal'});
 await page.getByRole('button',{name:'Salvar movimentação'}).click();
 await expect(page.getByText('Almoço',{exact:true})).toBeVisible();
 for(const width of [320,768,1024,1440]) {
  await page.setViewportSize({width,height:900});
  await expect(page.getByRole('button',{name:'Previsões',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
 await page.getByRole('button',{name:'Previsões',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Caixa previsto em 30 dias'})).toBeVisible();
 const accessibility=await new AxeBuilder({page}).analyze();
 expect(accessibility.violations).toEqual([]);
 expect(errors).toEqual([]);
 await page.getByRole('button',{name:'Resumo',exact:true}).click();
 await page.screenshot({path:'test-results/dashboard-preview.png',fullPage:true});
});
