import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ua from './ua'
import ru from './ru'

export type Lang = 'ua' | 'ru'

const saved = (localStorage.getItem('kohard-lang') as Lang | null) ?? 'ua'

i18n.use(initReactI18next).init({
  resources: { ua, ru },
  lng: saved,
  fallbackLng: 'ua',
  interpolation: { escapeValue: false },
})

export function setLang(lang: Lang) {
  localStorage.setItem('kohard-lang', lang)
  void i18n.changeLanguage(lang)
}

export default i18n
