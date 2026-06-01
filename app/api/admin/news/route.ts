import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - List news items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')
    const include_unpublished = searchParams.get('include_unpublished') === 'true'

    // For public access (no telegram_id), only return published news
    if (!telegram_id) {
      const result = await query(
        'SELECT * FROM news WHERE is_published = true ORDER BY published_at DESC LIMIT 50'
      )
      return NextResponse.json(result.rows)
    }

    // Check if user is admin for full access
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    const isAdmin = adminCheck.rows.length > 0 && adminCheck.rows[0].is_admin

    // Return all news for admins, only published for regular users
    const whereClause = isAdmin && include_unpublished ? '' : 'WHERE is_published = true'
    const result = await query(
      `SELECT * FROM news ${whereClause} ORDER BY
       CASE WHEN is_published THEN published_at ELSE created_at END DESC
       LIMIT 100`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create news item (admin only)
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Check if user is admin
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, category, is_published } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const published_at = is_published ? new Date().toISOString() : null

    const result = await query(
      `INSERT INTO news (title, content, category, is_published, published_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, content, category || 'general', is_published || false, published_at]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH - Update news item (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    // Check if user is admin
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { id, title, content, category, is_published } = body

    if (!id) {
      return NextResponse.json({ error: 'News id is required' }, { status: 400 })
    }

    const updates = []
    const values = []
    let paramCount = 1

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`)
      values.push(title)
    }
    if (content !== undefined) {
      updates.push(`content = $${paramCount++}`)
      values.push(content)
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`)
      values.push(category)
    }
    if (is_published !== undefined) {
      updates.push(`is_published = $${paramCount++}`)
      values.push(is_published)

      // Set published_at when publishing
      if (is_published) {
        updates.push(`published_at = $${paramCount++}`)
        values.push(new Date().toISOString())
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    const result = await query(
      `UPDATE news SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Delete news item (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')
    const id = searchParams.get('id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({ error: 'News id is required' }, { status: 400 })
    }

    // Check if user is admin
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const result = await query('DELETE FROM news WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, deleted: result.rows[0] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
