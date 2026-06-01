import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET - List all FAQ items
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')
    const include_inactive = searchParams.get('include_inactive') === 'true'

    // For public access (no telegram_id), only return active FAQs
    if (!telegram_id) {
      const result = await query(
        'SELECT * FROM faq WHERE is_active = true ORDER BY order_index ASC, created_at ASC'
      )
      return NextResponse.json(result.rows)
    }

    // Check if user is admin for full access
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    const isAdmin = adminCheck.rows.length > 0 && adminCheck.rows[0].is_admin

    // Return all FAQs for admins, only active for regular users
    const whereClause = isAdmin && include_inactive ? '' : 'WHERE is_active = true'
    const result = await query(
      `SELECT * FROM faq ${whereClause} ORDER BY order_index ASC, created_at ASC`
    )

    return NextResponse.json({ faqs: result.rows })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create new FAQ item (admin only)
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
    const { question, answer, category, order_index } = body

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO faq (question, answer, category, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [question, answer, category || 'general', order_index || 0]
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

// PATCH - Update FAQ item (admin only)
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
    const { id, question, answer, category, order_index, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'FAQ id is required' }, { status: 400 })
    }

    const updates = []
    const values = []
    let paramCount = 1

    if (question !== undefined) {
      updates.push(`question = $${paramCount++}`)
      values.push(question)
    }
    if (answer !== undefined) {
      updates.push(`answer = $${paramCount++}`)
      values.push(answer)
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`)
      values.push(category)
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`)
      values.push(order_index)
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(is_active)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    const result = await query(
      `UPDATE faq SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
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

// DELETE - Delete FAQ item (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const telegram_id = searchParams.get('telegram_id')
    const id = searchParams.get('id')

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 })
    }

    if (!id) {
      return NextResponse.json({ error: 'FAQ id is required' }, { status: 400 })
    }

    // Check if user is admin
    const adminCheck = await query(
      'SELECT is_admin FROM users WHERE telegram_id = $1',
      [telegram_id]
    )

    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const result = await query('DELETE FROM faq WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
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
