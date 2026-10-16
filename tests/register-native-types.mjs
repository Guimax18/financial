// Node 24 strips TypeScript natively. Match the extension resolution used by
// Next's bundler for these tests without starting a separate transpiler process.
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

registerHooks({
 resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
   if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
   if (specifier === 'next/server') return nextResolve('next/server.js', context);
   if (specifier.startsWith('.') && !extname(specifier)) return nextResolve(`${specifier}.ts`, context);
   throw error;
  }
 },
});
