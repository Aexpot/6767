// Test checkSubscription function
import { remnawave } from './lib/remnawave'
require('dotenv').config({ path: '.env' })

async function test() {
  console.log('Testing checkSubscription for telegram_id=8329401174\n')
  
  try {
    // Try getUser directly
    console.log('Calling getUser...')
    const user = await remnawave.getUser('tg_8329401174')
    console.log('\nUser from getUser:')
    console.log('- username:', user.username)
    console.log('- status:', user.status)
    console.log('- subscription_url:', user.subscription_url)
    console.log('\nFull user object:')
    console.log(JSON.stringify(user, null, 2))
  } catch (error) {
    console.error('Error calling getUser:', error)
  }
  
  console.log('\n---\n')
  
  const result = await remnawave.checkSubscription(8329401174)
  
  console.log('Result from checkSubscription:')
  console.log(JSON.stringify(result, null, 2))
}

test()
