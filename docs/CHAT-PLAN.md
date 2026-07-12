# KOHARD Часы — Этап 2: Чат (владелец ↔ работники ↔ клиенты)

> План «на потом»: при одобрении сейчас — только сохранить его в репозиторий
> (`docs/CHAT-PLAN.md`) и закоммитить. Реализация запускается отдельной командой,
> когда заказчик подтвердит этап 2.

## Контекст

Приложение учёта часов KOHARD (этап 1) готово и опубликовано: репозиторий
`dimahodonovich22/kohard-hours`, демо на GitHub Pages, боевой Firebase — позже.
Заказчик хочет чат вместо WhatsApp, связывающий три роли: владелец (admin),
работники (worker) и клиенты компании (заказчики услуг — новая роль `client`).

**Согласованные решения:**
- Структура: групповые чаты по объектам из справочника + личные диалоги (DM).
- Клиенты попадают по **пригласительной ссылке**, привязанной к объекту.
- Кабинет клиента — **только чат** его объекта (без фотоленты, часов, ставок).
- Пуш-уведомления — отдельный подэтап (2в), требует Blaze + Cloud Functions;
  честное ограничение: на iPhone пуши работают только у установленной на
  главный экран PWA и менее надёжны, чем WhatsApp — заказчик предупреждён.

## Что уже есть и переиспользуется

| Что | Где |
|---|---|
| Роли/статусы, live-профиль | `src/context/AuthContext.tsx`, `users/{uid}` |
| Справочник объектов | `src/lib/objects.ts`, коллекция `objects` |
| Сжатие фото + оффлайн-очередь | `src/lib/photos.ts`, `src/lib/uploadQueue.ts` |
| Показ фото из Storage | `src/components/StoragePhoto.tsx` |
| UI-кит (Button, Card, Chip…) | `src/components/ui.tsx` |
| Демо-режим (in-memory, GitHub Pages) | `src/lib/demo.ts` (`isDemo`, `demoDb`, `demoAuth`) |
| Создание пользователя админом без слёта сессии | `src/lib/adminUsers.ts` (вторичный Firebase app) |
| i18n ua/ru | `src/i18n/` |

## Модель данных (Firestore)

```
users/{uid}            — добавить role: 'client', clientObjectIds: string[]
invites/{inviteId}     — { objectId, objectName, createdByUid, createdAt,
                          usedByUid: null|string, expiresAt }
chats/{chatId}         — объектный: id = `obj_<objectId>`,
                          { type:'object', objectId, name }
                        — личный: id = `dm_<uidA>_<uidB>` (uid отсортированы),
                          { type:'direct', memberIds:[a,b], memberNames:{...} }
                        общие поля: lastMessageText, lastMessageAt,
                          lastReadAt: { [uid]: Timestamp }   // для бейджей
chats/{chatId}/messages/{msgId}
                        — { senderId, senderName, senderRole, text,
                            photoPath: string|null, createdAt: serverTimestamp }
```

- Непрочитанное = `lastMessageAt > lastReadAt[uid]` (булев индикатор, без
  дорогих счётчиков). `lastReadAt[uid]` обновляется при открытии чата.
- Фото чата: Storage `chat-photos/{chatId}/{msgId}.jpg` — через существующие
  `compressPhoto` + `enqueuePhoto` (работает оффлайн).
- Сообщения не редактируются; удалять может только админ.

## Правила безопасности (firestore.rules, storage.rules)

- `chats` (object): читают active admin/worker; client — только если
  `objectId in clientObjectIds` его профиля.
- `chats` (direct): читают только `memberIds`; создать DM может любой active
  admin/worker (client — только с админом).
- `messages`: create — участник чата, `senderId == request.auth.uid`,
  `createdAt == request.time`; update — запрещён; delete — только admin.
- Обновление `lastReadAt` — участник меняет только свой ключ
  (`affectedKeys().hasOnly(['lastReadAt'])` + diff по своему uid).
- `invites`: создаёт admin; читать по прямому id может любой залогиненный;
  update — только установка `usedByUid` из null в свой uid.
- `users` create: разрешить `role:'client', status:'active'` ТОЛЬКО при
  валидном неиспользованном invite (`get(invites/$(inviteId))`), с
  `clientObjectIds == [invite.objectId]`.
- Клиенту запрещено всё остальное: смены/пользователи уже закрыты текущими
  правилами (читает только своё), проверить `objects` read (клиенту не нужно).
- Storage: `chat-photos/**` — запись участникам (contentType image, < 3MB),
  чтение залогиненным.

## Подэтап 2а — внутренний чат (admin + workers)

1. **`src/lib/chat.ts`** — слой данных: `watchMyChats`, `watchMessages`
   (limit 50 + подгрузка старых), `sendMessage(text|photo)`, `markRead`,
   `openDm(uid)`, `ensureObjectChat(objectId)` (создание лениво при первом
   сообщении). Ветвление `isDemo` → зеркала в `demo.ts` (по образцу demoDb).
2. **UI работника/админа:**
   - `src/pages/chat/ChatListPage.tsx` — список: объектные чаты (для admin —
     все объекты, для worker — все объекты; сортировка по lastMessageAt),
     личные диалоги, зелёная точка «непрочитано», кнопка «написать» (выбор
     собеседника из активных пользователей).
   - `src/pages/chat/ChatPage.tsx` — лента сообщений (свои справа в brand,
     чужие слева на белом, имя+роль, разделители дат), поле ввода, кнопка
     фото (камера/галерея — в чате галерея разрешена), автоскролл,
     `markRead` при открытии, у админа — удаление по long-press/кнопке.
3. **Навигация** (`src/App.tsx`, `AppShell`): вкладка «Чат» с бейджем
   непрочитанного. Worker: Сьогодні / Чат / Історія / Ще. Admin: Зараз / Чат /
   Звіти / Працівники / Ще — «Заявки» переносятся секцией наверх страницы
   «Працівники» (бейдж заявок вешается на вкладку «Працівники»).
4. **i18n**: ключи `chat.*` в ua/ru.
5. **Демо**: сид-чаты и сообщения в `demo.ts`, чтобы чат было видно по
   демо-ссылке к следующему созвону.

## Подэтап 2б — клиенты по пригласительной ссылке

1. **Роль `client`** в `src/lib/types.ts` (+ `clientObjectIds`).
2. **Генерация приглашения** (админ): на странице объекта/в `ObjectsPage` —
   кнопка «Пригласить клиента» → создаёт `invites/{id}` → показывает ссылку
   `https://…/#/invite/{id}` с кнопкой «копировать» (демо: заглушка).
3. **`src/pages/InvitePage.tsx`** (маршрут `/invite/:id`, доступен без входа):
   читает invite → форма регистрации клиента (имя, email, пароль, телефон
   опц.) → `createUserWithEmailAndPassword` → user-doc `role:'client'`,
   `clientObjectIds:[objectId]` → пометить invite использованным.
4. **Кабинет клиента** (`ClientApp` в `src/App.tsx`): только чат его объекта
   (если объектов несколько — список чатов) + «Ещё» (язык, выход). Никаких
   смен, часов, ставок, других людей.
5. **Язык NL (опционально, решить с заказчиком)**: третий словарь
   `src/i18n/nl.ts` — как минимум для экранов клиента (invite, чат,
   настройки); переключатель UA/RU/NL показывать только клиентам.
6. Клиент в объектном чате помечается чипом «Клиент», работники его видят.

## Подэтап 2в — пуш-уведомления (опционально, после боевого Firebase)

- Требует: боевой проект на Blaze (уже нужен для Storage) + первая серверная
  часть — `functions/` (Node, `onDocumentCreated('chats/{c}/messages/{m}')` →
  FCM-рассылка участникам, кроме отправителя).
- Клиентская часть: `firebase/messaging`, запрос разрешения из настроек
  («Включить уведомления»), токены в `users/{uid}.fcmTokens[]`, сервис-воркер
  `firebase-messaging-sw.js` (совместить с PWA-воркером vite-plugin-pwa —
  проверить `injectManifest`).
- Ограничения зафиксировать в README: iOS — только установленная PWA (16.4+),
  доставка не гарантирована как в WhatsApp.

## Порядок и оценка

| Подэтап | Объём | Комментарий |
|---|---|---|
| 2а внутренний чат | ~1 сессия работы | сразу видно в демо |
| 2б клиенты + инвайты | ~1 сессия | требует решения по NL |
| 2в пуши | ~0.5 сессии | только после боевого Firebase (Blaze) |

## Проверка (E2E перед сдачей этапа)

1. Эмуляторы: два окна браузера — админ и работник; переписка в объектном
   чате и DM обновляется live в обе стороны; бейджи непрочитанного появляются
   и гаснут; фото из чата открывается; оффлайн-тест: сообщение и фото,
   отправленные в авиарежиме, доезжают после появления сети.
2. Инвайт: админ создаёт ссылку → инкогнито-окно → регистрация клиента →
   клиент видит ТОЛЬКО чат своего объекта; прямые URL `/reports`, `/workers`
   недоступны; повторное использование ссылки отклоняется правилами.
3. Правила: негативные проверки через emulator REST (worker не читает чужой
   DM, client не читает чужой объектный чат, update чужого lastReadAt
   отклоняется).
4. Демо-сборка `npm run build:demo`: чат и демо-клиент кликабельны на
   GitHub Pages, обе локали.
5. `npm run build` чистый; коммит и пуш (демо обновится автоматически).
