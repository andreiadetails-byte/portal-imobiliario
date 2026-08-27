// Cliente para o Cloudflare R2 — compatível com a API do S3 da Amazon,
// por isso usamos o SDK oficial da AWS, só a apontar para o endpoint do R2.
//
// Isto corre SÓ no servidor (nunca no browser) — as credenciais nunca saem
// daqui. O browser envia a foto para uma rota de API nossa, e é essa rota
// que fala com o R2, não o browser diretamente.

import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
