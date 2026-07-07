import { useTranslation } from 'react-i18next'
import { formatDuration } from './types'

/** Форматтер длительности «8 ч 50 м» / «8 г 50 хв» с учётом языка */
export function useDuration(): (min: number) => string {
  const { t } = useTranslation()
  return (min: number) => formatDuration(min, t('common.hoursShort'), t('common.minutesShort'))
}
