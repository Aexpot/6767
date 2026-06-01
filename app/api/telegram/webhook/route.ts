import { NextRequest, NextResponse } from 'next/server'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.championvpn.fun'
const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'ChampionVPN_bot'
const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || []
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID

function isAdmin(userId: number): boolean {
  return ADMIN_IDS.includes(userId)
}

async function checkChannelSubscription(userId: number): Promise<boolean> {
  if (!TELEGRAM_CHANNEL_ID || !BOT_TOKEN) {
    return true // Skip check if not configured
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${TELEGRAM_CHANNEL_ID}&user_id=${userId}`
    )

    const data = await response.json()

    if (!data.ok) {
      console.error('Failed to check channel subscription:', data)
      return false
    }

    const status = data.result.status
    return ['member', 'administrator', 'creator'].includes(status)
  } catch (error) {
    console.error('Error checking channel subscription:', error)
    return false
  }
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    chat: {
      id: number
      type: string
    }
    date: number
    text?: string
  }
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
      username?: string
    }
    message?: {
      message_id: number
      chat: {
        id: number
      }
    }
    data?: string
  }
}

async function sendMessage(chatId: number, text: string, options?: {
  reply_markup?: object
  parse_mode?: string
}) {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not set')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode || 'HTML',
        reply_markup: options?.reply_markup
      })
    })

    const result = await response.json()
    if (!result.ok) {
      console.error('Telegram API error:', result)
    }
    return result
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!BOT_TOKEN) return

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text
      })
    })
    const result = await response.json()
    if (!result.ok) {
      console.error('Telegram API error (callback):', result)
    }
  } catch (error) {
    console.error('Error answering callback:', error)
  }
}

async function editMessageText(chatId: number, messageId: number, text: string, options?: {
  reply_markup?: object
  parse_mode?: string
}) {
  if (!BOT_TOKEN) return

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      reply_markup: options?.reply_markup
    })
  })
}

export async function POST(request: NextRequest) {
  // DISABLED: Telegram bot logic moved to remnawave-minishop (Python aiogram bot).
  // The bot now runs at https://tg.championvpn.fun/webhook/telegram
  // This route is kept for backward compatibility but does nothing.
  return NextResponse.json({ ok: true, note: 'bot moved to remnawave-minishop' })

  // eslint-disable-next-line no-unreachable
  try {
    const update: TelegramUpdate = await request.json()

    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message!.chat.id
      const userId = update.message!.from.id
      const firstName = update.message!.from.first_name
      const startParam = update.message!.text!.split(' ')[1] // Get referral code if present

      // Check channel subscription
      const isSubscribed = await checkChannelSubscription(userId)

      if (!isSubscribed && TELEGRAM_CHANNEL_ID) {
        const channelUrl = `https://t.me/${TELEGRAM_CHANNEL_ID.replace('@', '')}`

        await sendMessage(chatId,
          `<b>Привет, ${firstName}!</b> 👋\n\n` +
          `Добро пожаловать в <b>ChampionVPN</b> - быстрый и безопасный VPN сервис.\n\n` +
          `🔒 <b>Для доступа к боту необходимо подписаться на наш канал:</b>\n\n` +
          `🎁 После подписки вы получите:\n` +
          `• Новости и обновления\n` +
          `• Эксклюзивные акции\n` +
          `• Полезные советы\n\n` +
          `👇 Подпишитесь на канал и нажмите "Я подписался"`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📢 Подписаться на канал', url: channelUrl }],
                [{ text: '✅ Я подписался', callback_data: 'check_subscription' }]
              ]
            }
          }
        )
        return NextResponse.json({ ok: true })
      }

      const webAppUrl = startParam
        ? `${WEBAPP_URL}?startapp=${startParam}`
        : WEBAPP_URL

      await sendMessage(chatId,
        `<b>Привет, ${firstName}!</b> 👋\n\n` +
        `Добро пожаловать в <b>ChampionVPN</b> - быстрый и безопасный VPN сервис.\n\n` +
        `<b>Как начать:</b>\n` +
        `1️⃣ Откройте приложение\n` +
        `2️⃣ Нажмите "Установка и настройка"\n` +
        `3️⃣ Следуйте инструкциям для вашего устройства\n\n` +
        `Возникли вопросы? Напишите в /support`,
        {
          reply_markup: {
            inline_keyboard: [
              [{
                text: '🚀 Открыть приложение',
                web_app: { url: webAppUrl }
              }],
              [{ text: '📖 Инструкция', callback_data: 'help' }],
              [{ text: '💬 Поддержка', callback_data: 'support' }]
            ]
          }
        }
      )
    }

    // Handle /help command
    else if (update.message?.text === '/help') {
      const chatId = update.message.chat.id

      await sendMessage(chatId,
        `<b>📖 Как пользоваться ChampionVPN</b>\n\n` +
        `<b>Шаг 1:</b> Откройте приложение через кнопку ниже\n\n` +
        `<b>Шаг 2:</b> Нажмите "Установка и настройка"\n\n` +
        `<b>Шаг 3:</b> Выберите вашу платформу (iOS, Android, Windows, macOS)\n\n` +
        `<b>Шаг 4:</b> Следуйте инструкциям на экране\n\n` +
        `<b>Тарифы:</b>\n` +
        `• 1 месяц - 199₽\n` +
        `• 3 месяца - 499₽ (166₽/мес)\n` +
        `• 6 месяцев - 949₽ (158₽/мес) ⭐\n` +
        `• 1 год - 1699₽ (142₽/мес)\n\n` +
        `💡 Пригласите друзей и получите +15% дней к подписке!`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Открыть приложение', web_app: { url: WEBAPP_URL } }]
            ]
          }
        }
      )
    }

    // Handle /support command
    else if (update.message?.text === '/support') {
      const chatId = update.message.chat.id
      const supportUsername = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_USERNAME || 'support'

      await sendMessage(chatId,
        `<b>💬 Поддержка ChampionVPN</b>\n\n` +
        `Если у вас возникли проблемы:\n\n` +
        `1. Проверьте раздел FAQ в приложении\n` +
        `2. Убедитесь, что подписка активна\n` +
        `3. Попробуйте переподключиться к VPN\n\n` +
        `Если проблема не решена, напишите нашему специалисту поддержки:\n\n` +
        `👤 <b>@${supportUsername}</b>\n\n` +
        `<i>Время ответа: обычно до 2 часов</i>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 Написать в поддержку', url: `https://t.me/${supportUsername}` }],
              [{ text: '❓ FAQ', web_app: { url: `${WEBAPP_URL}?screen=faq` } }],
              [{ text: '🚀 Открыть приложение', web_app: { url: WEBAPP_URL } }]
            ]
          }
        }
      )
    }

    // Handle /referral command
    else if (update.message?.text === '/referral') {
      const chatId = update.message.chat.id
      const userId = update.message.from.id
      const referralLink = `https://t.me/${BOT_USERNAME}?start=ref${userId}`

      await sendMessage(chatId,
        `<b>🎁 Реферальная программа</b>\n\n` +
        `Приглашайте друзей и получайте <b>+15%</b> бонусных дней от всех их пополнений!\n\n` +
        `<b>Ваша реферальная ссылка:</b>\n` +
        `<code>${referralLink}</code>\n\n` +
        `<i>Нажмите на ссылку, чтобы скопировать</i>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Моя статистика', web_app: { url: `${WEBAPP_URL}?screen=referral` } }],
              [{ text: '📤 Поделиться', switch_inline_query: `Попробуй ChampionVPN - быстрый VPN! ${referralLink}` }]
            ]
          }
        }
      )
    }

    // Handle /account command
    else if (update.message?.text === '/account') {
      const chatId = update.message.chat.id

      await sendMessage(chatId,
        `<b>👤 Личный кабинет</b>\n\n` +
        `Откройте приложение, чтобы увидеть:\n` +
        `• Статус подписки\n` +
        `• Историю платежей\n` +
        `• Настройки профиля\n` +
        `• Реферальную статистику`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👤 Открыть профиль', web_app: { url: `${WEBAPP_URL}?screen=profile` } }]
            ]
          }
        }
      )
    }

    // Handle /admin command (only for admins)
    else if (update.message?.text === '/admin') {
      const chatId = update.message.chat.id
      const userId = update.message.from.id

      if (!isAdmin(userId)) {
        await sendMessage(chatId, '❌ У вас нет доступа к админ-панели.')
        return NextResponse.json({ ok: true })
      }

      await sendMessage(chatId,
        `<b>🛡️ Админ-панель ChampionVPN</b>\n\n` +
        `Выберите действие:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📊 Статистика', callback_data: 'admin_stats' },
                { text: '👥 Пользователи', callback_data: 'admin_users' }
              ],
              [
                { text: '💳 Платежи', callback_data: 'admin_payments' },
                { text: '⚙️ Настройки', callback_data: 'admin_settings' }
              ],
              [
                { text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }
              ]
            ]
          }
        }
      )
    }

    // Handle callback queries
    else if (update.callback_query) {
      const callbackData = update.callback_query.data
      const chatId = update.callback_query.message?.chat.id
      const userId = update.callback_query.from.id

      await answerCallbackQuery(update.callback_query.id)

      // Admin callbacks
      if (callbackData?.startsWith('admin_')) {
        if (!isAdmin(userId)) {
          await answerCallbackQuery(update.callback_query.id, '❌ Доступ запрещен')
          return NextResponse.json({ ok: true })
        }

        if (callbackData === 'admin_stats' && chatId) {
          try {
            const response = await fetch(`${WEBAPP_URL}/api/admin/stats?telegram_id=${userId}`)
            const stats = await response.json()

            await sendMessage(chatId,
              `<b>📊 Статистика ChampionVPN</b>\n\n` +
              `👥 Всего пользователей: <b>${stats.total_users}</b>\n` +
              `✅ Активных подписок: <b>${stats.active_subscriptions}</b>\n` +
              `📈 Новых сегодня: <b>+${stats.today_users}</b>\n\n` +
              `💰 <b>Доходы:</b>\n` +
              `• Сегодня: <b>${stats.today_revenue.toLocaleString('ru-RU')} ₽</b>\n` +
              `• За месяц: <b>${stats.monthly_revenue.toLocaleString('ru-RU')} ₽</b>\n` +
              `• Всего: <b>${stats.total_revenue.toLocaleString('ru-RU')} ₽</b>\n\n` +
              `⏳ Ожидают оплаты: <b>${stats.pending_payments}</b>`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🔄 Обновить', callback_data: 'admin_stats' }],
                    [{ text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }],
                    [{ text: '◀️ Назад', callback_data: 'admin_menu' }]
                  ]
                }
              }
            )
          } catch (error) {
            await sendMessage(chatId!, '❌ Ошибка загрузки статистики')
          }
        }

        else if (callbackData === 'admin_users' && chatId) {
          await sendMessage(chatId,
            `<b>👥 Управление пользователями</b>\n\n` +
            `Для полного управления пользователями откройте веб-панель.\n\n` +
            `Там вы сможете:\n` +
            `• Искать пользователей\n` +
            `• Выдавать/отменять подписки\n` +
            `• Банить/разбанивать\n` +
            `• Назначать администраторов\n` +
            `• Писать пользователям`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }],
                  [{ text: '◀️ Назад', callback_data: 'admin_menu' }]
                ]
              }
            }
          )
        }

        else if (callbackData === 'admin_payments' && chatId) {
          try {
            const response = await fetch(`${WEBAPP_URL}/api/admin/payments?telegram_id=${userId}&page=1`)
            const data = await response.json()
            const payments = data.payments.slice(0, 5)

            let message = `<b>💳 Последние платежи</b>\n\n`

            if (payments.length === 0) {
              message += `Нет платежей`
            } else {
              payments.forEach((p: any, i: number) => {
                const status = p.status === 'completed' ? '✅' :
                              p.status === 'processing' ? '⏳' :
                              p.status === 'failed' ? '❌' : '❓'
                message += `${i + 1}. ${status} <b>${Number(p.amount_rub) || 0} ₽</b>\n`
                message += `   @${p.users?.username || 'N/A'} | ${p.subscriptions?.subscription_plans?.name}\n\n`
              })
            }

            message += `\n<i>Для полного управления откройте веб-панель</i>`

            await sendMessage(chatId,
              message,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }],
                    [{ text: '◀️ Назад', callback_data: 'admin_menu' }]
                  ]
                }
              }
            )
          } catch (error) {
            await sendMessage(chatId!, '❌ Ошибка загрузки платежей')
          }
        }

        else if (callbackData === 'admin_settings' && chatId) {
          try {
            const response = await fetch(`${WEBAPP_URL}/api/admin/settings?telegram_id=${userId}`)
            const settings = await response.json()

            const maintenanceButton = settings.maintenance_mode
              ? { text: '🟢 Выключить тех. работы', callback_data: 'admin_maintenance_off' }
              : { text: '🔴 Включить тех. работы', callback_data: 'admin_maintenance_on' }

            await sendMessage(chatId,
              `<b>⚙️ Настройки системы</b>\n\n` +
              `🔧 Режим тех. работ: ${settings.maintenance_mode ? '🔴 Включен' : '🟢 Выключен'}\n` +
              `🌐 Remnawave API: ${settings.remnawave_configured ? '✅ Настроен' : '❌ Не настроен'}\n\n` +
              `Используйте кнопки ниже для управления:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [maintenanceButton],
                    [{ text: '🔄 Перезапустить сервер', callback_data: 'admin_restart' }],
                    [{ text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }],
                    [{ text: '◀️ Назад', callback_data: 'admin_menu' }]
                  ]
                }
              }
            )
          } catch (error) {
            await sendMessage(chatId!, '❌ Ошибка загрузки настроек')
          }
        }

        else if (callbackData === 'admin_maintenance_on' && chatId) {
          try {
            await answerCallbackQuery(update.callback_query.id, '⏳ Включаю режим тех. работ...')

            const response = await fetch(`${WEBAPP_URL}/api/admin/settings?telegram_id=${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                maintenance_mode: true,
                maintenance_message: '🔧 Ведутся технические работы. Скоро вернемся!'
              })
            })

            if (response.ok) {
              await editMessageText(chatId, update.callback_query.message!.message_id,
                `<b>⚙️ Настройки системы</b>\n\n` +
                `🔧 Режим тех. работ: 🔴 Включен\n` +
                `🌐 Remnawave API: ✅ Настроен\n\n` +
                `✅ Режим технических работ включен!\n` +
                `Пользователи увидят уведомление.`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🟢 Выключить тех. работы', callback_data: 'admin_maintenance_off' }],
                      [{ text: '🔄 Перезапустить сервер', callback_data: 'admin_restart' }],
                      [{ text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }],
                      [{ text: '◀️ Назад', callback_data: 'admin_menu' }]
                    ]
                  }
                }
              )
            } else {
              await answerCallbackQuery(update.callback_query.id, '❌ Ошибка')
            }
          } catch (error) {
            await answerCallbackQuery(update.callback_query.id, '❌ Ошибка')
          }
        }

        else if (callbackData === 'admin_maintenance_off' && chatId) {
          try {
            await answerCallbackQuery(update.callback_query.id, '⏳ Выключаю режим тех. работ...')

            const response = await fetch(`${WEBAPP_URL}/api/admin/settings?telegram_id=${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                maintenance_mode: false,
                maintenance_message: ''
              })
            })

            if (response.ok) {
              await editMessageText(chatId, update.callback_query.message!.message_id,
                `<b>⚙️ Настройки системы</b>\n\n` +
                `🔧 Режим тех. работ: 🟢 Выключен\n` +
                `🌐 Remnawave API: ✅ Настроен\n\n` +
                `✅ Режим технических работ выключен!\n` +
                `Сервис работает в обычном режиме.`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🔴 Включить тех. работы', callback_data: 'admin_maintenance_on' }],
                      [{ text: '🔄 Перезапустить сервер', callback_data: 'admin_restart' }],
                      [{ text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }],
                      [{ text: '◀️ Назад', callback_data: 'admin_menu' }]
                    ]
                  }
                }
              )
            } else {
              await answerCallbackQuery(update.callback_query.id, '❌ Ошибка')
            }
          } catch (error) {
            await answerCallbackQuery(update.callback_query.id, '❌ Ошибка')
          }
        }

        else if (callbackData === 'admin_restart' && chatId) {
          await sendMessage(chatId,
            `<b>🔄 Перезапуск сервера</b>\n\n` +
            `⚠️ Вы уверены, что хотите перезапустить сервер?\n\n` +
            `Это займет около 10-15 секунд.\n` +
            `Все пользователи будут временно отключены.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Да, перезапустить', callback_data: 'admin_restart_confirm' }],
                  [{ text: '❌ Отмена', callback_data: 'admin_settings' }]
                ]
              }
            }
          )
        }

        else if (callbackData === 'admin_restart_confirm' && chatId) {
          try {
            await answerCallbackQuery(update.callback_query.id, '🔄 Перезапускаю сервер...')

            await sendMessage(chatId,
              `<b>🔄 Перезапуск сервера</b>\n\n` +
              `⏳ Сервер перезапускается...\n` +
              `Подождите 10-15 секунд.`
            )

            // Trigger restart via API
            const response = await fetch(`${WEBAPP_URL}/api/admin/system?telegram_id=${userId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'restart' })
            })

            if (response.ok) {
              setTimeout(async () => {
                await sendMessage(chatId,
                  `<b>✅ Сервер перезапущен</b>\n\n` +
                  `Все системы работают в штатном режиме.`,
                  {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: '◀️ Назад в админку', callback_data: 'admin_menu' }]
                      ]
                    }
                  }
                )
              }, 15000)
            } else {
              await sendMessage(chatId, '❌ Ошибка при перезапуске сервера')
            }
          } catch (error) {
            await sendMessage(chatId!, '❌ Ошибка при перезапуске сервера')
          }
        }

        else if (callbackData === 'admin_menu' && chatId) {
          await sendMessage(chatId,
            `<b>🛡️ Админ-панель ChampionVPN</b>\n\n` +
            `Выберите действие:`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📊 Статистика', callback_data: 'admin_stats' },
                    { text: '👥 Пользователи', callback_data: 'admin_users' }
                  ],
                  [
                    { text: '💳 Платежи', callback_data: 'admin_payments' },
                    { text: '⚙️ Настройки', callback_data: 'admin_settings' }
                  ],
                  [
                    { text: '🚀 Открыть веб-панель', web_app: { url: `${WEBAPP_URL}?screen=admin` } }
                  ]
                ]
              }
            }
          )
        }
      }

      // Check subscription callback
      else if (callbackData === 'check_subscription' && chatId) {
        const isSubscribed = await checkChannelSubscription(userId)

        if (!isSubscribed && TELEGRAM_CHANNEL_ID) {
          await answerCallbackQuery(update.callback_query.id, '❌ Вы еще не подписались на канал')

          const channelUrl = `https://t.me/${TELEGRAM_CHANNEL_ID.replace('@', '')}`

          await sendMessage(chatId,
            `❌ <b>Подписка не найдена</b>\n\n` +
            `Пожалуйста, подпишитесь на канал и попробуйте снова.\n\n` +
            `После подписки нажмите "Я подписался"`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📢 Подписаться на канал', url: channelUrl }],
                  [{ text: '✅ Я подписался', callback_data: 'check_subscription' }]
                ]
              }
            }
          )
        } else {
          await answerCallbackQuery(update.callback_query.id, '✅ Подписка подтверждена!')

          await sendMessage(chatId,
            `✅ <b>Отлично! Подписка подтверждена</b>\n\n` +
            `Теперь вы можете пользоваться всеми функциями бота.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Открыть приложение', web_app: { url: WEBAPP_URL } }]
                ]
              }
            }
          )
        }
      }

      // Regular callbacks
      else if (callbackData === 'help' && chatId) {
        await sendMessage(chatId,
          `<b>📖 Быстрая помощь</b>\n\n` +
          `Используйте команды:\n` +
          `/help - Инструкция по использованию\n` +
          `/support - Связаться с поддержкой\n` +
          `/referral - Реферальная программа\n` +
          `/account - Личный кабинет`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚀 Открыть приложение', web_app: { url: WEBAPP_URL } }]
              ]
            }
          }
        )
      } else if (callbackData === 'support' && chatId) {
        await sendMessage(chatId,
          `<b>💬 Поддержка</b>\n\n` +
          `Опишите вашу проблему, и мы ответим в ближайшее время.\n\n` +
          `Или посмотрите FAQ в приложении.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '❓ FAQ', web_app: { url: `${WEBAPP_URL}?screen=faq` } }]
              ]
            }
          }
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// GET endpoint to set up webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 })
  }

  if (action === 'setWebhook') {
    const webhookUrl = `${WEBAPP_URL}/api/telegram/webhook`
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    })

    const result = await response.json()
    return NextResponse.json(result)
  }

  if (action === 'deleteWebhook') {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`)
    const result = await response.json()
    return NextResponse.json(result)
  }

  if (action === 'getWebhookInfo') {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
    const result = await response.json()
    return NextResponse.json(result)
  }

  if (action === 'setCommands') {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Запустить бота' },
          { command: 'help', description: 'Помощь и инструкция' },
          { command: 'account', description: 'Личный кабинет' },
          { command: 'referral', description: 'Реферальная программа' },
          { command: 'support', description: 'Поддержка' },
          { command: 'admin', description: '🛡️ Админ-панель (только для админов)' }
        ]
      })
    })

    const result = await response.json()
    return NextResponse.json(result)
  }

  return NextResponse.json({ 
    message: 'Telegram Bot API',
    actions: ['setWebhook', 'deleteWebhook', 'getWebhookInfo', 'setCommands'],
    usage: '?action=setWebhook'
  })
}
