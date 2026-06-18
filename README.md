# 🎯 BetGoal

Tu coach personal para apostar con disciplina y cumplir tus metas.

## Cómo subir a Vercel (5 minutos)

### Opción A — Desde GitHub (recomendada)

1. Crea una cuenta en [github.com](https://github.com) si no tienes
2. Crea un repositorio nuevo llamado `betgoal`
3. Sube todos estos archivos al repositorio
4. Ve a [vercel.com](https://vercel.com) y entra con tu cuenta de GitHub
5. Clic en **"Add New Project"** → selecciona el repo `betgoal`
6. Vercel detecta Vite automáticamente — solo clic en **"Deploy"**
7. En ~1 minuto tendrás tu URL pública 🚀

### Opción B — Vercel CLI

```bash
npm install -g vercel
cd betgoal-app
npm install
vercel
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Variables de entorno

La app usa la API de Anthropic desde el frontend (para el prototipo).
Para producción real se recomienda mover las llamadas a un backend.

## Stack

- React 18 + Vite
- Recharts (gráficas)
- Lucide React (íconos)
- Claude API (análisis de boletos + Guía IA)
