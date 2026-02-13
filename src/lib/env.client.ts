import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('Crafted'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_BASE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>

let cachedClientEnv: ClientEnv | null = null

export function getClientEnv(): ClientEnv {
  if (!cachedClientEnv) {
    cachedClientEnv = clientEnvSchema.parse({
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    })
  }
  return cachedClientEnv
}
