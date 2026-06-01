import { NextResponse } from 'next/server'

// Trial system removed
export async function GET() {
  return NextResponse.json({ trial_used: true }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: 'Trial system removed' }, { status: 410 })
}
