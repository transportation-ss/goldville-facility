import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client（僅限 Server Actions / Route Handlers 使用）
 * 擁有完整 Admin 權限，絕對不能暴露在前端
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
