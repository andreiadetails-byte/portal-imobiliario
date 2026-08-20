# Morada — código inicial

Projeto Next.js ligado ao Supabase (mesma base de dados que já criaste).

## O que já está a funcionar de verdade

- **Login e registo** (com escolha entre Particular/Agência)
- **Página inicial** — lista imóveis reais vindos da tabela `properties`
- **Publicar imóvel** — grava mesmo na base de dados (fica com estado "em_revisao")
- **Página de detalhe** — formulário de contacto grava uma lead real na tabela `leads`
- **Painel** — mostra os teus imóveis e as leads recebidas, com sessão real (Supabase Auth)

## O que falta (próxima fase)

Chat, favoritos, pesquisas guardadas, perfil de agência, tradução multi-idioma, página de resultados com filtros — foram deixados de fora nesta primeira versão para teres algo simples a funcionar ponta a ponta primeiro. Adicionamos por cima disto.

---

## Como correr localmente

1. Instala as dependências:
   ```
   npm install
   ```

2. Copia o ficheiro de exemplo de variáveis de ambiente:
   ```
   cp .env.local.example .env.local
   ```

3. Abre `.env.local` e preenche com os dados do teu projeto Supabase
   (Supabase → Project Settings → API → "Project URL" e "anon public" key).

4. Corre o site localmente:
   ```
   npm run dev
   ```

5. Abre http://localhost:3000

---

## Como enviar para o GitHub

Se ainda não tens git configurado no computador, instala o Git primeiro (git-scm.com).

No terminal, dentro desta pasta:

```
git init
git add .
git commit -m "Primeira versão do Morada"
git branch -M main
git remote add origin https://github.com/O-TEU-UTILIZADOR/morada-app.git
git push -u origin main
```

(Substitui o URL pelo do repositório que criaste no GitHub — vazio, sem README nem .gitignore, para não haver conflitos.)

---

## Como publicar no Netlify

1. No Netlify: **Add new site → Import an existing project → GitHub** → escolhe o repositório `morada-app`
2. Em "Build settings", o Netlify deteta Next.js automaticamente
3. Em **Site settings → Environment variables**, adiciona as mesmas duas variáveis do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — a partir daqui, cada `git push` publica uma versão nova automaticamente
