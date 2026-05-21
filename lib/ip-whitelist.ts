// Middleware to check if IP is allowed (bypass Telegram check)
export async function checkAllowedIP(ip: string): Promise<boolean> {
  if (!ip) return false

  try {
    const { Pool } = await import('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })

    const result = await pool.query(
      'SELECT id FROM allowed_ips WHERE ip_address = $1',
      [ip]
    )

    await pool.end()
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking allowed IP:', error)
    return false
  }
}

// Get client IP from request
export function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return null
}
