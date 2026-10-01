import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default defineConfig([...next, ...ts, globalIgnores(['.next/**','.pytest_cache/**','**/__pycache__/**','.data/**','release-preview/**','docs/**','next-env.d.ts','deploy/*.compiled.js'])]);
