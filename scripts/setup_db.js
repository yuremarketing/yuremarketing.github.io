import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
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

console.log('Connecting to Supabase at:', url);
const supabase = createClient(url, serviceKey);

async function setupDatabase() {
  // Insert initial projects to create the schema / seed data
  const initialProjects = [
    {
      title: 'Portfólio Dinâmico & Inteligente',
      description: 'Portfólio de alta performance construído com Vite, React, Supabase e LinkedIn OpenID Connect via Docker.',
      url: 'https://yuremarketing.github.io',
      github_url: 'https://github.com/yuremarketing/yuremarketing.github.io',
      tags: ['React', 'Vite', 'Supabase', 'Docker', 'CSS Pure'],
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      visible: true,
    },
    {
      title: 'AI Engineering & Agent Automation',
      description: 'Sistema de orquestração de agentes autônomos para automação de fluxos de desenvolvimento e infraestrutura.',
      url: 'https://github.com/yuremarketing',
      github_url: 'https://github.com/yuremarketing',
      tags: ['AI Engineering', 'Python', 'LLM', 'Docker'],
      image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      visible: true,
    }
  ];

  const { data, error } = await supabase.from('projects').insert(initialProjects).select();

  if (error) {
    console.error('Error seeding projects table:', error);
  } else {
    console.log('Successfully seeded database with projects:', data);
  }
}

setupDatabase();
