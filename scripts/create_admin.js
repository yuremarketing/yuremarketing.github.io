import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length > 0) {
    envVars[key.trim()] = vals.join('=').trim();
  }
});

const url = envVars.VITE_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_API_KEY;

const supabase = createClient(url, serviceKey);

async function createAdminUser() {
  const email = process.argv[2] || 'admin@yuremarketing.com';
  const password = process.argv[3] || 'SenhaForte123!';

  console.log(`Criando usuário admin: ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  if (error) {
    console.error('Erro ao criar usuário:', error.message);
  } else {
    console.log('✅ Usuário Admin criado com SUCESSO!');
    console.log('ID do usuário:', data.user.id);
    console.log('Email:', data.user.email);
  }
}

createAdminUser();
