import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://mtgc_user:mtgc_password@localhost:5432/mtgc_db?schema=public',
  },
});
