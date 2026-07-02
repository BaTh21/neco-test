import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import jp from './jp.json'
import km from './km.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { 
      en: { translation: en }, 
      km: { translation: km }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  })

export default i18n
