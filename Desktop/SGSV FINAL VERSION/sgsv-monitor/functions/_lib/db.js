import { neon } from '@neondatabase/serverless';

export const getDb = (env) => neon(env.DATABASE_URL);
