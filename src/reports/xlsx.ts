import * as XLSX from 'xlsx'
import type { TFunction } from 'i18next'
import { minutesToDecimal, shiftEarnings, travelMinutes, workedMinutes, type WorkerSummary } from './data'

const money = (n: number) => Math.round(n * 100) / 100

/** .xlsx: лист «Итог» + лист «Детали». Открывается в Google Таблицах и Excel. */
export function exportXlsx(summaries: WorkerSummary[], period: string, t: TFunction): void {
  const wb = XLSX.utils.book_new()

  const summaryRows = [
    [t('report.title')],
    [`${t('report.period')}: ${period}`],
    [],
    [
      t('admin.worker'),
      t('admin.days'),
      t('admin.workH'),
      t('admin.travelH'),
      t('admin.lunchH'),
      t('admin.totalH'),
      t('report.earned'),
    ],
    ...summaries.map((s) => [
      s.userName,
      s.days,
      minutesToDecimal(s.workMin),
      minutesToDecimal(s.travelMin),
      minutesToDecimal(s.lunchMin),
      minutesToDecimal(s.workMin + s.travelMin),
      money(s.earnings),
    ]),
    [],
    [
      t('common.total'),
      '',
      minutesToDecimal(summaries.reduce((a, s) => a + s.workMin, 0)),
      minutesToDecimal(summaries.reduce((a, s) => a + s.travelMin, 0)),
      minutesToDecimal(summaries.reduce((a, s) => a + s.lunchMin, 0)),
      minutesToDecimal(summaries.reduce((a, s) => a + s.workMin + s.travelMin, 0)),
      money(summaries.reduce((a, s) => a + s.earnings, 0)),
    ],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 7 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, t('report.summarySheet'))

  const detailRows = [
    [
      t('admin.worker'),
      t('report.date'),
      t('report.object'),
      t('report.arrival'),
      t('report.departure'),
      t('report.lunchMin'),
      t('report.travelMin'),
      t('report.workedH'),
      t('report.rate'),
      t('report.earned'),
    ],
    ...summaries.flatMap((sum) =>
      sum.shifts.map((s) => [
        s.userName,
        s.date,
        s.objectName,
        s.arrivalTime,
        s.departureTime ?? '',
        s.lunchMinutes || 0,
        minutesToDecimal(travelMinutes(s)),
        minutesToDecimal(workedMinutes(s)),
        money(s.hourlyRate || 0),
        money(shiftEarnings(s)),
      ]),
    ),
  ]
  const wsDetails = XLSX.utils.aoa_to_sheet(detailRows)
  wsDetails['!cols'] = [
    { wch: 24 },
    { wch: 11 },
    { wch: 34 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
    { wch: 9 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDetails, t('report.detailsSheet'))

  XLSX.writeFile(wb, `kohard-uren-${period.replaceAll(' ', '')}.xlsx`)
}
