#!/bin/bash

LINKEDIN_CLIENT_ID="774nfobuuhqwwj"

echo "Cole o LinkedIn Client Secret abaixo e pressione Enter:"
read -r LINKEDIN_CLIENT_SECRET

if [ -z "$LINKEDIN_CLIENT_SECRET" ]; then
  echo "Nenhum secret inserido. Abortando."
  exit 1
fi

echo "LINKEDIN_CLIENT_ID=$LINKEDIN_CLIENT_ID" >> .env
echo "LINKEDIN_CLIENT_SECRET=$LINKEDIN_CLIENT_SECRET" >> .env

echo "✅ LinkedIn Client ID e Secret salvos no arquivo .env com sucesso!"
