// Browser contract fixture only. Actual RLS is tested separately in PostgreSQL.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const user={id:'00000000-0000-4000-8000-000000000001',email:'a@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{full_name:'Pessoa de teste'},created_at:new Date().toISOString()};
const sid='10000000-0000-4000-8000-000000000001';
const tables = {
 profiles:[{id:user.id,full_name:'Pessoa de teste'}],
 spaces:[{id:sid,name:'Casa',type:'family',owner_id:user.id}],
 space_members:[{space_id:sid,user_id:user.id,role:'owner'}], accounts:[],cards:[],debts:[],categories:[],transactions:[],
};
createServer(async (request,response) => {
 response.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3111');
 response.setHeader('Access-Control-Allow-Headers',request.headers['access-control-request-headers'] || '*');
 response.setHeader('Access-Control-Expose-Headers','content-range');
 response.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS,DELETE');
 if(request.method==='OPTIONS'){response.writeHead(204);response.end();return;}
 response.setHeader('content-type','application/json');
 const url=new URL(request.url,'http://127.0.0.1');
 const send=(body,status=200)=>{response.writeHead(status);response.end(JSON.stringify(body));};
 if(url.pathname==='/health') return send({ok:true});
 if(url.pathname==='/auth/v1/user') return send(user);
 if(url.pathname==='/auth/v1/logout') return send({});
 const table=url.pathname.split('/').at(-1);
 if(table==='finance_summary') return send({balance_cents:tables.accounts.reduce((sum,a)=>sum+a.opening_cents,0),income_cents:0,expense_cents:0,pending_cash_cents:0});
 const source=table==='account_balances'?'accounts':table==='card_balances'?'cards':table==='debt_balances'?'debts':table;
 if(!(source in tables)) return send({message:'Unsupported test endpoint'},404);
 let body='';for await(const chunk of request) body+=chunk;
 if(request.method==='POST') {
  const row={id:randomUUID(),created_at:new Date().toISOString(),...JSON.parse(body)};
  tables[source].push(row);return send([row],201);
 }
 let rows=tables[source].filter(row=>[...url.searchParams].every(([key,value])=>!value.startsWith('eq.')||String(row[key])===value.slice(3)));
 if(request.method==='PATCH') {for(const row of rows)Object.assign(row,JSON.parse(body));return send(rows);}
 if(table==='account_balances')rows=rows.map(a=>({...a,balance_cents:a.opening_cents}));
 if(table==='card_balances')rows=rows.map(a=>({...a,owed_cents:0}));
 if(table==='debt_balances')rows=rows.map(a=>({...a,remaining_cents:a.principal_cents}));
 response.setHeader('content-range',rows.length?`0-${rows.length-1}/${rows.length}`:'*/0');
 if(request.headers.accept?.includes('application/vnd.pgrst.object+json'))return send(rows[0]||null);
 return send(rows);
}).listen(54329,'127.0.0.1');
