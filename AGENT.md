# AGENT.md

This file provides guidance for AI assistants working with the Sink project.

## Project Overview

Sink is a URL shortening service built with Nuxt 3 and Cloudflare Workers. It provides analytics, real-time tracking, and a modern web interface.

## Key Technologies

- **Frontend**: Nuxt 3, Vue 3, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Cloudflare Workers, H3 (Nitro)
- **Database**: Cloudflare KV
- **Analytics**: Cloudflare Analytics Engine
- **Deployment**: Cloudflare Pages/Workers

## Project Structure

```txt
Sink/
├── app/                     # Nuxt 3 application
│   ├── components/          # Vue components
│   ├── pages/              # File-based routing
│   ├── layouts/            # Layout components
│   ├── utils/              # Utility functions
│   └── middleware/         # Route middleware
├── server/                  # Server-side API
│   ├── api/                # API endpoints
│   ├── middleware/         # Server middleware
│   └── utils/              # Server utilities
├── public/                 # Static assets
├── schemas/                # TypeScript schemas
├── tests/                  # Test files
└── docs/                   # Documentation
```

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests
- `pnpm lint` - Run ESLint

## Key Conventions

### Code Style

- Use TypeScript for all new code
- Follow Vue 3 Composition API patterns
- Use PascalCase for component names
- Use camelCase for variables and functions
- Use kebab-case for CSS classes

### API Structure

- RESTful endpoints in `/server/api/`
- Use Zod for schema validation in `/schemas/`
- Implement proper error handling
- Use Cloudflare environment variables for configuration

### Database

- Use Cloudflare KV

### Testing

- Use Vitest for unit tests
- Test files should be co-located with source files
- Use the existing test utilities in `/tests/utils.ts`

## Environment Variables

Key environment variables to be aware of:

- `NUXT_CF_ACCOUNT_ID` - Cloudflare account ID
- `NUXT_CF_API_TOKEN` - Cloudflare API token
- `NUXT_DATASET` - Analytics engine ID
- `NUXT_SITE_TOKEN` - Site token for management

## Common Tasks

### Adding a New API Endpoint

1. Create file in `/server/api/` with appropriate HTTP method
2. Add Zod schema validation in `/schemas/`
3. Add tests in `/tests/api/`
4. Update documentation if needed

### Adding a New Component

1. Use existing UI components from `/app/components/ui/`
2. Follow the established component patterns
3. Add TypeScript interfaces for props
4. Consider adding to storybook if applicable

## Security Guidelines

- Never commit secrets or API keys
- Use environment variables for sensitive configuration
- Validate all user input with Zod schemas
- Implement rate limiting on API endpoints
- Follow OWASP guidelines for web security

## Performance Considerations

- Use Cloudflare's edge caching where appropriate
- Minimize bundle size by using dynamic imports
- Optimize images and assets
- Use the existing analytics for monitoring

## Troubleshooting

- Check Cloudflare dashboard for worker logs
- Use `wrangler tail` for real-time logs
- Verify environment variables are properly set

## Deployment

- Staging: Automatic on push to `main` branch
- Production: Manual trigger via Cloudflare dashboard
- Use `wrangler deploy` for manual deployments
