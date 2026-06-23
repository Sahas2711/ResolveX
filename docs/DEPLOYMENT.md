# Deployment Guide

> Complete guide for deploying ResolveX to production on Vercel with PostgreSQL.

---

## 1. Prerequisites

- **Vercel account** (Hobby or Pro plan)
- **PostgreSQL database** — Any provider (Vercel Postgres, Neon, AWS RDS, Supabase)
- **Cloudinary account** (for file attachments — optional)
- **Git repository** (GitHub, GitLab, or Bitbucket)

---

## 2. Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | Access token signing key (min 32 chars) | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Refresh token signing key (min 32 chars) | `openssl rand -base64 64` |

### Optional

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_PATH` | Cloudinary folder path (default: `/HOME/RESOLVE-X`) |

---

## 3. Deploy to Vercel

### Option A: Deploy from Git (Recommended)

1. Push your code to a GitHub/GitLab/Bitbucket repository

2. Go to [vercel.com](https://vercel.com) and click **Add New → Project**

3. Import your repository

4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `web/` (if in monorepo)

5. Add environment variables (all of the above)

6. The `vercel.json` already configures:
   ```json
   {
     "framework": "nextjs",
     "buildCommand": "prisma generate && npm run build",
     "installCommand": "npm install"
   }
   ```

7. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from the web directory
cd web
vercel --prod
```

The CLI will prompt for environment variables on first deploy.

---

## 4. Database Setup

### 4.1 Production Database

1. Create a PostgreSQL database (e.g., via Vercel Postgres, Neon, or AWS RDS)

2. Set `DATABASE_URL` in your Vercel project environment variables

3. Run migrations: The build command `prisma generate && npm run build` handles this.
   For the initial deployment, you may need to run migrations manually:

```bash
# Run from your local machine with production DATABASE_URL set
DATABASE_URL="postgresql://..." npm run db:migrate:deploy
```

Or use Vercel's post-deploy hook or GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 4.2 Seed Data

After deploying and running migrations, seed the database:

```bash
# Run from local with production DATABASE_URL
DATABASE_URL="postgresql://..." npm run db:seed
```

This creates:
- All permissions (40+)
- All roles (5)
- Admin user (`admin@resolvex.com` / `Admin@123`)
- Product categories
- Complaint categories

---

## 5. Vercel Configuration

The project includes `vercel.json` with security headers:

```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && npm run build",
  "installCommand": "npm install",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

## 6. Post-Deployment Checklist

- [ ] Visit `/api/v1/health` — should return `{ "success": true, "data": { "status": "healthy" } }`
- [ ] Log in with admin credentials
- [ ] Create a test complaint
- [ ] Test status transitions
- [ ] Verify file uploads (if Cloudinary configured)
- [ ] Check dashboard analytics load correctly
- [ ] Verify RBAC — create a user with limited role and confirm restricted access
- [ ] Test comment creation and editing
- [ ] Verify timeline events are being logged

---

## 7. Production Considerations

### 7.1 Database Connection Pooling

For production, consider using a connection pooler like **PgBouncer** or **Vercel Postgres** (which includes pooling):

```
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&schema=public"
```

### 7.2 JWT Secrets

Generate strong secrets:

```bash
openssl rand -base64 64
```

Store these in Vercel Environment Variables — never commit them to the repository.

### 7.3 File Storage

Cloudinary is configured for file attachments. Ensure:
- Upload preset or API credentials are configured
- Folder path is set via `CLOUDINARY_PATH`
- Allowed file types are configured: jpg, png, pdf, docx
- Max file size: 10 MB

### 7.4 Monitoring

Enable Vercel Analytics and Logs:
- **Web Analytics**: Track page views and performance
- **Logs**: View serverless function logs for debugging
- **Error Monitoring**: Track 4xx and 5xx responses

### 7.5 Scaling

- Next.js App Router and Vercel's Edge Network handle scaling automatically
- Consider Vercel Pro for production workloads
- Database connection limits may require a pooler for high concurrency

---

## 8. Troubleshooting

### Build Fails

**Issue**: `Module '@prisma/client' has no exported member 'PrismaClient'`

**Solution**: Run `prisma generate` before the build:
```bash
npx prisma generate
```

**Issue**: TypeScript errors during build

**Solution**: Check TypeScript errors locally:
```bash
npx tsc --noEmit
```

### Database Connection

**Issue**: `Can't reach database server`

**Solution**: 
- Verify `DATABASE_URL` is correctly set in Vercel
- Check that the database allows connections from Vercel's IP range
- For Vercel Postgres, ensure the database is not paused

### Authentication

**Issue**: `401 Unauthorized` on all requests

**Solution**:
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Clear localStorage and re-login
- Check that tokens are being sent in the `Authorization` header

---

## 9. Related Documentation

- [Architecture Overview](./ARCHITECTURE.md) — System architecture
- [API Reference](./API.md) — Complete API documentation
- [Database Schema](./DATABASE.md) — Data model details
