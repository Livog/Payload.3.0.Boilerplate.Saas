import { getAuthResponseWithCookie } from '@/lib/auth'

export async function GET(request: Request): Promise<Response> {
  return await getAuthResponseWithCookie({ provider: 'github', requestUrl: request.url })
}
