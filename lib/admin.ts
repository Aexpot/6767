import { NextRequest } from 'next/server'

const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || []

export function isAdmin(telegramId: number): boolean {
  return ADMIN_TELEGRAM_IDS.includes(telegramId)
}

export function checkAdminAccess(request: NextRequest): { isAdmin: boolean; telegramId: number | null } {
  const { searchParams } = new URL(request.url)
  const telegramIdParam = searchParams.get('telegram_id') || searchParams.get('admin_telegram_id')

  if (!telegramIdParam) {
    return { isAdmin: false, telegramId: null }
  }

  const telegramId = parseInt(telegramIdParam)
  return {
    isAdmin: isAdmin(telegramId),
    telegramId
  }
}
