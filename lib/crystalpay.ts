// CrystalPay API Integration
// Docs: https://docs.crystalpay.io/

const CRYSTALPAY_LOGIN = process.env.CRYSTALPAY_LOGIN!
const CRYSTALPAY_SECRET = process.env.CRYSTALPAY_SECRET!
const CRYSTALPAY_SALT = process.env.CRYSTALPAY_SALT!
const CRYSTALPAY_API_URL = 'https://api.crystalpay.io/v2'

interface CrystalPayInvoice {
  id: string
  url: string
  amount: number
  currency: string
  status: 'notpayed' | 'processing' | 'payed' | 'expired'
  created_at: string
  extra?: string
}

class CrystalPayClient {
  private login: string
  private secret: string
  private salt: string
  private baseUrl: string

  constructor(login: string, secret: string, salt: string) {
    this.login = login
    this.secret = secret
    this.salt = salt
    this.baseUrl = CRYSTALPAY_API_URL
  }

  private generateSignature(params: Record<string, any>): string {
    const crypto = require('crypto')
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join(';')
    return crypto
      .createHash('sha1')
      .update(sortedParams + ';' + this.secret)
      .digest('hex')
  }

  async createInvoice(params: {
    amount: number
    currency?: string
    description?: string
    extra?: string
    callback_url?: string
    lifetime?: number
  }): Promise<CrystalPayInvoice> {
    const invoiceParams = {
      auth_login: this.login,
      auth_secret: this.secret,
      amount: params.amount.toString(),
      type: 'purchase',
      lifetime: (params.lifetime || 3600).toString(),
      description: params.description || '',
      extra: params.extra || '',
      callback_url: params.callback_url || '',
    }

    const signature = this.generateSignature(invoiceParams)

    const response = await fetch(`${this.baseUrl}/invoice/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...invoiceParams,
        signature,
      }),
    })

    const data = await response.json()

    if (!data.error || data.error === false) {
      return {
        id: data.id,
        url: data.url,
        amount: parseFloat(data.amount),
        currency: data.type,
        status: data.state,
        created_at: new Date().toISOString(),
        extra: data.extra,
      }
    }

    throw new Error(`CrystalPay API error: ${JSON.stringify(data)}`)
  }

  async getInvoice(id: string): Promise<CrystalPayInvoice> {
    const params = {
      auth_login: this.login,
      auth_secret: this.secret,
      id,
    }

    const signature = this.generateSignature(params)

    const response = await fetch(`${this.baseUrl}/invoice/info/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        signature,
      }),
    })

    const data = await response.json()

    if (!data.error || data.error === false) {
      return {
        id: data.id,
        url: data.url,
        amount: parseFloat(data.amount),
        currency: data.type,
        status: data.state,
        created_at: data.created_at,
        extra: data.extra,
      }
    }

    throw new Error(`CrystalPay API error: ${JSON.stringify(data)}`)
  }

  verifyWebhookSignature(body: any, signature: string): boolean {
    const crypto = require('crypto')
    // CrystalPay webhook signature format: SHA1({id}:{salt})
    const expectedSignature = crypto
      .createHash('sha1')
      .update(`${body.id}:${this.salt}`)
      .digest('hex')

    console.log('Signature verification:', {
      received: signature,
      expected: expectedSignature,
      match: expectedSignature === signature
    })

    return expectedSignature === signature
  }
}

export const crystalPay = new CrystalPayClient(CRYSTALPAY_LOGIN, CRYSTALPAY_SECRET, CRYSTALPAY_SALT)

export function isCrystalPayConfigured(): boolean {
  return !!(CRYSTALPAY_LOGIN && CRYSTALPAY_SECRET)
}

export type { CrystalPayInvoice }
