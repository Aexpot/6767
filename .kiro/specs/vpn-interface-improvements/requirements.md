# Requirements Document

## Introduction

Данная спецификация описывает улучшения интерфейса VPN-приложения для повышения информативности и удобства управления устройствами, трафиком и подписками. Основные изменения включают детализацию информации об устройствах, разделение типов трафика, и добавление функции безопасного перевыпуска ссылки подписки с подтверждением.

## Glossary

- **VPN_Application**: Клиентское приложение для управления VPN-подключениями
- **Device_Section**: Раздел интерфейса, отображающий информацию о зарегистрированных устройствах
- **Traffic_Section**: Раздел интерфейса, отображающий информацию о доступном и использованном трафике
- **Subscription_Link**: Уникальная ссылка для импорта VPN-подписки на устройство
- **Remnawawe**: Внешний сервис для управления VPN-подписками и перевыпуска ссылок
- **Regular_Traffic**: Трафик для обычных серверов без ограничений
- **Whitelist_Traffic**: Трафик для обхода белых списков с лимитированным объемом
- **Active_Device**: Устройство, которое зарегистрировано и использует текущую подписку
- **Device_Limit**: Максимальное количество устройств, разрешенное для подписки
- **Credentials**: Учетные данные для аутентификации VPN-подключения
- **Reissue_Function**: Функция перевыпуска ссылки подписки с отзывом предыдущих credentials

## Requirements

### Requirement 1: Отображение информации об устройствах

**User Story:** Как пользователь, я хочу видеть количество активных устройств и лимит, чтобы понимать, сколько устройств я могу еще подключить.

#### Acceptance Criteria

1. THE Device_Section SHALL display the count of active devices and device limit in format "Устройства: X / Y" where X is active device count and Y is device limit
2. WHEN the active device count equals zero, THE Device_Section SHALL display message "Пока ни одно устройство не зарегистрировано. Откройте подписку в Happ и устройство появится автоматически."
3. THE Device_Section SHALL display button "Докупить устройства" with price in Russian rubles
4. WHEN the user clicks "Докупить устройства" button, THE VPN_Application SHALL initiate device purchase flow
5. THE Device_Section SHALL update active device count within 5 seconds after a new device registers

### Requirement 2: Разделение типов трафика

**User Story:** Как пользователь, я хочу видеть отдельно обычный трафик и трафик для белых списков, чтобы понимать, какой тип трафика я использую.

#### Acceptance Criteria

1. THE Traffic_Section SHALL display two separate traffic types: Regular_Traffic and Whitelist_Traffic
2. THE Traffic_Section SHALL display Regular_Traffic with label "🌐 Обычные сервера: ∞" indicating unlimited traffic
3. THE Traffic_Section SHALL display Whitelist_Traffic in format "🏳️ Белые списки: X МБ / Y ГБ" where X is used traffic in megabytes and Y is purchased traffic in gigabytes
4. WHEN Whitelist_Traffic data is zero, THE Traffic_Section SHALL display actual usage values instead of placeholder zeros
5. THE Traffic_Section SHALL update traffic values within 10 seconds after traffic consumption changes

### Requirement 3: Покупка дополнительного трафика белых списков

**User Story:** Как пользователь, я хочу докупать трафик для белых списков, чтобы продолжать использовать эту функцию после исчерпания лимита.

#### Acceptance Criteria

1. THE Traffic_Section SHALL display button "Докупить ГБ" for purchasing additional Whitelist_Traffic
2. WHEN the user clicks "Докупить ГБ" button, THE VPN_Application SHALL initiate Whitelist_Traffic purchase flow
3. WHEN Whitelist_Traffic purchase completes successfully, THE Traffic_Section SHALL update the purchased traffic limit within 5 seconds
4. THE VPN_Application SHALL display confirmation message after successful Whitelist_Traffic purchase

### Requirement 4: Предупреждение при перевыпуске ссылки

**User Story:** Как пользователь, я хочу видеть предупреждение перед перевыпуском ссылки, чтобы понимать последствия этого действия.

#### Acceptance Criteria

1. WHEN the user initiates Reissue_Function, THE VPN_Application SHALL display warning dialog with title "⚠️ Перевыпуск ссылки подписки"
2. THE warning dialog SHALL contain message "После подтверждения: • Текущая ссылка перестанет работать • Все устройства с текущим ключом потеряют доступ • Будет выдана новая ссылка с новыми credentials • Срок подписки не изменится • Нужно будет заново импортировать подписку Вы уверены?"
3. THE warning dialog SHALL display two buttons: "Да" and "Вернуться назад"
4. WHEN the user clicks "Вернуться назад" button, THE VPN_Application SHALL close the warning dialog without performing reissue operation
5. THE warning dialog SHALL prevent accidental clicks by requiring explicit button interaction

### Requirement 5: Перевыпуск ссылки подписки

**User Story:** Как пользователь, я хочу перевыпустить ссылку подписки, чтобы отозвать доступ у скомпрометированных устройств.

#### Acceptance Criteria

1. WHEN the user clicks "Да" button in warning dialog, THE VPN_Application SHALL send reissue request to Remnawawe service
2. WHEN Remnawawe service returns new Subscription_Link, THE VPN_Application SHALL revoke all previous Credentials
3. THE VPN_Application SHALL complete reissue operation within 10 seconds after user confirmation
4. IF Remnawawe service returns error, THEN THE VPN_Application SHALL display error message and preserve current Subscription_Link
5. THE VPN_Application SHALL log reissue operation with timestamp and user identifier

### Requirement 6: Отображение новой ссылки после перевыпуска

**User Story:** Как пользователь, я хочу сразу получить новую ссылку после перевыпуска, чтобы импортировать ее на своих устройствах.

#### Acceptance Criteria

1. WHEN reissue operation completes successfully, THE VPN_Application SHALL display success dialog with title "✅ Ссылка подписки успешно перевыпущена!"
2. THE success dialog SHALL contain message "Все предыдущие подключения отозваны. 💎 Новая ссылка: [перевыпущенная ссылка из remnawawe] Импортируйте новую ссылку на ваших устройствах."
3. THE success dialog SHALL display the new Subscription_Link in selectable text format
4. THE VPN_Application SHALL provide copy-to-clipboard functionality for the new Subscription_Link
5. THE success dialog SHALL remain visible until the user explicitly closes it

### Requirement 7: Форматирование и отображение данных

**User Story:** Как пользователь, я хочу видеть данные в понятном формате, чтобы легко интерпретировать информацию.

#### Acceptance Criteria

1. THE VPN_Application SHALL display traffic values less than 1024 MB in megabytes with unit "МБ"
2. THE VPN_Application SHALL display traffic values greater than or equal to 1024 MB in gigabytes with unit "ГБ" rounded to two decimal places
3. THE VPN_Application SHALL display device count and limit as integers without decimal places
4. THE VPN_Application SHALL display prices in Russian rubles with currency symbol "₽"
5. THE VPN_Application SHALL use consistent emoji icons: 🌐 for Regular_Traffic, 🏳️ for Whitelist_Traffic, ⚠️ for warnings, ✅ for success, 💎 for new links

### Requirement 8: Обработка ошибок и граничных случаев

**User Story:** Как пользователь, я хочу получать понятные сообщения об ошибках, чтобы знать, что делать в случае проблем.

#### Acceptance Criteria

1. IF Device_Section fails to load device data, THEN THE VPN_Application SHALL display message "Не удалось загрузить информацию об устройствах. Попробуйте обновить страницу."
2. IF Traffic_Section fails to load traffic data, THEN THE VPN_Application SHALL display message "Не удалось загрузить информацию о трафике. Попробуйте обновить страницу."
3. IF Remnawawe service is unavailable during reissue, THEN THE VPN_Application SHALL display message "Сервис временно недоступен. Попробуйте позже."
4. IF network connection is lost during reissue operation, THEN THE VPN_Application SHALL display message "Проверьте подключение к интернету и попробуйте снова."
5. THE VPN_Application SHALL log all errors with error code, timestamp, and context information

### Requirement 9: Синхронизация данных

**User Story:** Как пользователь, я хочу видеть актуальные данные, чтобы принимать решения на основе текущей информации.

#### Acceptance Criteria

1. WHEN the user opens Device_Section, THE VPN_Application SHALL fetch current device data from server
2. WHEN the user opens Traffic_Section, THE VPN_Application SHALL fetch current traffic data from server
3. THE VPN_Application SHALL refresh device and traffic data every 60 seconds while sections are visible
4. WHEN the user performs action that changes data (purchase, reissue), THE VPN_Application SHALL immediately refresh affected sections
5. THE VPN_Application SHALL display loading indicator while fetching data that takes longer than 500 milliseconds

### Requirement 10: Доступность и локализация

**User Story:** Как пользователь, я хочу использовать интерфейс на русском языке, чтобы легко понимать все элементы.

#### Acceptance Criteria

1. THE VPN_Application SHALL display all user-facing text in Russian language
2. THE VPN_Application SHALL display all buttons with clear action-oriented labels in Russian
3. THE VPN_Application SHALL display all error messages in Russian language
4. THE VPN_Application SHALL display all numeric values using Russian locale formatting (space as thousands separator)
5. THE VPN_Application SHALL maintain consistent terminology across all interface sections
