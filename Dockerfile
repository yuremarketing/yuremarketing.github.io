# Dockerfile para ambiente de desenvolvimento com Vite + React
FROM node:20-alpine

WORKDIR /app

# Copia arquivos de manifesto do repositório
COPY package*.json ./

# Instala dependências (se houver package.json)
RUN if [ -f package.json ]; then npm install; fi

# Copia todo o código fonte
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
