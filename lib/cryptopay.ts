const CRYPTOPAY_API_TOKEN = process.env.CRYPTOPAY_API_TOKEN || ''
const CRYPTOPAY_API_URL = process.env.CRYPTOPAY_API_URL || 'https://pay.crypt.bot/api'

interface Invoice {
  invoice_id: number
  hash: string
  currency_type: string
  asset: string
  amount: string
  paid_asset?: string
  paid_amount?: string
  paid_at?: string
  bot_invoice_url: string
  mini_app_invoice_url: string
  web_app_invoice_url: string
  description?: string
  status: 'active' | 'paid' | 'expired'
  created_at: string
  payload?: string
}

class CryptoPayClient {
  private token: string
  private baseUrl: string

  constructor(token: string) {
    this.token = token
    this.baseUrl = CRYPTOPAY_API_URL
  }

  private async request<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.token) {
      throw new Error('CRYPTOPAY_API_TOKEN is not configured. Check your environment variables.')
    }
    
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Crypto-Pay-API-Token': this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (!data.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data.error) || 'Unknown error'
      throw new Error(`CryptoPay API error: ${errorMsg}`)
    }

    return data.result as T
  }

  async createInvoice(params: {
    asset: string
    amount: string
    description?: string
    payload?: string
  }): Promise<Invoice> {
    if (!this.token) {
      throw new Error('CRYPTOPAY_API_TOKEN is not configured')
    }
    return this.request<Invoice>('createInvoice', params)
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const crypto = require('crypto')
    const secret = crypto.createHash('sha256').update(this.token).digest()
    const checkString = crypto.createHmac('sha256', secret).update(body).digest('hex')
    return checkString === signature
  }
}

export const cryptoPay = new CryptoPayClient(CRYPTOPAY_API_TOKEN)

export type { Invoice }
