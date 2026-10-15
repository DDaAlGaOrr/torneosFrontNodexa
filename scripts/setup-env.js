const fs = require('fs');
const path = require('path');

const envTemplate = `import 'dotenv/config';

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'torneos_db',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
} as const;
`;

const envPath = path.join(__dirname, '../api/src/config/environment.ts');

// Crear directorio si no existe
const dir = path.dirname(envPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Crear archivo
fs.writeFileSync(envPath, envTemplate);
console.log('✅ Environment file created at:', envPath);
