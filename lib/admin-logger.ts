import { query } from '@/lib/db'

export interface AdminLogData {
  admin_id: string
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export async function logAdminAction(data: AdminLogData) {
  try {
    await query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.admin_id,
        data.action,
        data.entity_type || null,
        data.entity_id || null,
        data.details ? JSON.stringify(data.details) : null,
        data.ip_address || null,
        data.user_agent || null
      ]
    )
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

export async function getAdminLogs(filters?: {
  admin_id?: string
  action?: string
  entity_type?: string
  limit?: number
  offset?: number
}) {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filters?.admin_id) {
    conditions.push(`admin_id = $${paramIndex}`)
    params.push(filters.admin_id)
    paramIndex++
  }

  if (filters?.action) {
    conditions.push(`action = $${paramIndex}`)
    params.push(filters.action)
    paramIndex++
  }

  if (filters?.entity_type) {
    conditions.push(`entity_type = $${paramIndex}`)
    params.push(filters.entity_type)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters?.limit || 100
  const offset = filters?.offset || 0

  const result = await query(
    `SELECT
      al.*,
      u.first_name,
      u.last_name,
      u.telegram_id
     FROM admin_logs al
     JOIN users u ON al.admin_id = u.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  )

  return result.rows
}
