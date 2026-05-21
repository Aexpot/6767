import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Get client IP from headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  let clientIP = null

  if (forwarded) {
    clientIP = forwarded.split(',')[0].trim()
  } else if (realIP) {
    clientIP = realIP
  }

  return new NextResponse(clientIP || 'unknown', {
    headers: { 'Content-Type': 'text/plain' }
  })
}
