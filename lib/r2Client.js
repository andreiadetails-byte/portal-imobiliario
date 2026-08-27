// Cliente para o Cloudflare R2 — compatível com a API do S3 da Amazon,
// por isso usamos o SDK oficial da AWS, só a apontar para o endpoint do R2.
//
// Isto corre SÓ no servidor (nunca no browser) — as credenciais nunca saem
// daqui. O browser envia a foto para uma rota de API nossa, e é essa rota
// que fala com o R2, não o browser diretamente.

import { S3Client } from '@aws-sdk/client-s3';

// Se por engano a variável R2_ACCOUNT_ID tiver sido guardada com "https://"
// à frente, ou com a barra no fim, isto limpa isso — evita o erro
// "getaddrinfo ENOTFOUND" por causa de um endereço mal formado.
const accountId = (process.env.R2_ACCOUNT_ID || '')
  .replace(/^https?:\/\//, '')
  .replace(/\.r2\.cloudflarestorage\.com.*$/, '')
  .replace(/\/$/, '');

export const r2Client = new S3Client({
  region: 'auto',
  // O bucket foi criado com jurisdição "EU" no Cloudflare — buckets assim
  // precisam de um endereço próprio (com ".eu." no meio), diferente do
  // endereço normal. Sem isto, dá sempre "Access Denied", mesmo com as
  // permissões certas no token.
  endpoint: `https://${accountId}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // O R2 recomenda "path style" (endereco.com/bucket/ficheiro) em vez do
  // estilo por defeito da Amazon (bucket.endereco.com/ficheiro) — evita
  // problemas de nomes de endereço mal formados como o que tivemos agora.
  forcePathStyle: true,
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
