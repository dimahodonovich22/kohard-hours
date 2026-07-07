import type { TFunction } from 'i18next'
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatMinutes, formatMoney, shiftEarnings, travelMinutes, workedMinutes, type WorkerSummary } from './data'

const BRAND_DARK = '#13743D'
const INK = '#161616'
const MIST = '#E9E9E9'

const th = (text: string, center = false): TableCell => ({
  text,
  bold: true,
  fontSize: 9,
  color: BRAND_DARK,
  fillColor: '#CBECDA',
  alignment: center ? 'center' : 'left',
})

const td = (text: string, opts: { bold?: boolean; center?: boolean } = {}): TableCell => ({
  text,
  fontSize: 9,
  color: INK,
  bold: opts.bold ?? false,
  alignment: opts.center ? 'center' : 'left',
})

let logoDataUrl: string | null = null

async function getLogo(): Promise<string | null> {
  if (logoDataUrl) return logoDataUrl
  try {
    const blob = await (await fetch('/logo.png')).blob()
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
    return logoDataUrl
  } catch {
    return null
  }
}

/** PDF-отчёт с логотипом KOHARD (Roboto в pdfmake поддерживает кириллицу) */
export async function exportPdf(summaries: WorkerSummary[], period: string, t: TFunction): Promise<void> {
  // pdfmake подтягиваем лениво — это тяжёлая библиотека, работникам она не нужна
  const [{ default: pdfMake }, pdfFonts] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const fontsModule = pdfFonts as unknown as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> }
  ;(pdfMake as unknown as { vfs: Record<string, string> }).vfs =
    fontsModule.pdfMake?.vfs ?? fontsModule.vfs ?? {}

  const logo = await getLogo()

  const sum = (fn: (s: WorkerSummary) => number) => summaries.reduce((a, s) => a + fn(s), 0)

  const summaryBody: TableCell[][] = [
    [
      th(t('admin.worker')),
      th(t('admin.days'), true),
      th(t('admin.workH'), true),
      th(t('admin.travelH'), true),
      th(t('admin.lunchH'), true),
      th(t('admin.totalH'), true),
      th(t('admin.earnedH'), true),
    ],
    ...summaries.map((s) => [
      td(s.userName),
      td(String(s.days), { center: true }),
      td(formatMinutes(s.workMin), { center: true }),
      td(formatMinutes(s.travelMin), { center: true }),
      td(formatMinutes(s.lunchMin), { center: true }),
      td(formatMinutes(s.workMin + s.travelMin), { center: true, bold: true }),
      td(formatMoney(s.earnings), { center: true, bold: true }),
    ]),
    [
      td(t('common.total'), { bold: true }),
      td(''),
      td(formatMinutes(sum((s) => s.workMin)), { center: true, bold: true }),
      td(formatMinutes(sum((s) => s.travelMin)), { center: true, bold: true }),
      td(formatMinutes(sum((s) => s.lunchMin)), { center: true, bold: true }),
      td(formatMinutes(sum((s) => s.workMin + s.travelMin)), { center: true, bold: true }),
      td(formatMoney(sum((s) => s.earnings)), { center: true, bold: true }),
    ],
  ]

  const detailSections: Content[] = summaries.flatMap((w): Content[] => [
    { text: w.userName, bold: true, fontSize: 11, color: BRAND_DARK, margin: [0, 14, 0, 4] },
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            th(t('report.date')),
            th(t('report.object')),
            th(t('report.arrival'), true),
            th(t('report.departure'), true),
            th(t('report.lunchMin'), true),
            th(t('report.travelMin'), true),
            th(t('report.workedH'), true),
            th(t('admin.rateH'), true),
            th(t('admin.earnedH'), true),
          ],
          ...w.shifts.map((s) => [
            td(s.date.split('-').reverse().join('.')),
            td(s.objectName),
            td(s.arrivalTime, { center: true }),
            td(s.departureTime ?? '—', { center: true }),
            td(s.lunchMinutes ? String(s.lunchMinutes) : '—', { center: true }),
            td(travelMinutes(s) ? formatMinutes(travelMinutes(s)) : '—', { center: true }),
            td(formatMinutes(workedMinutes(s)), { center: true, bold: true }),
            td(s.hourlyRate ? formatMoney(s.hourlyRate) : '—', { center: true }),
            td(formatMoney(shiftEarnings(s)), { center: true, bold: true }),
          ]),
        ],
      },
      layout: tableLayout,
    },
  ])

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [36, 96, 36, 44],
    header: {
      table: {
        widths: ['*'],
        body: [
          [
            {
              columns: [
                logo
                  ? { image: logo, width: 120, margin: [0, 6, 0, 0] }
                  : { text: 'KOHARD', color: 'white', bold: true, fontSize: 20 },
                {
                  stack: [
                    { text: t('report.title'), color: 'white', bold: true, fontSize: 13, alignment: 'right' },
                    {
                      text: `${t('report.period')}: ${period}`,
                      color: '#CBECDA',
                      fontSize: 10,
                      alignment: 'right',
                      margin: [0, 3, 0, 0],
                    },
                  ],
                },
              ],
              fillColor: INK,
              margin: [24, 16, 24, 16],
            },
          ],
        ],
      },
      layout: 'noBorders',
    },
    footer: (page: number, pages: number) => ({
      columns: [
        {
          text: `KOHARD · kohard.be · ${t('report.generated')}: ${new Date().toLocaleDateString('nl-BE')}`,
          fontSize: 8,
          color: '#5D6773',
        },
        { text: `${page} / ${pages}`, fontSize: 8, color: '#5D6773', alignment: 'right' },
      ],
      margin: [36, 14, 36, 0],
    }),
    content: [
      {
        table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'], body: summaryBody },
        layout: tableLayout,
      },
      ...detailSections,
    ],
    defaultStyle: { font: 'Roboto' },
  }

  pdfMake.createPdf(doc).download(`kohard-uren-${period.replaceAll(' ', '')}.pdf`)
}

const tableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0,
  hLineColor: () => MIST,
  paddingTop: () => 5,
  paddingBottom: () => 5,
  paddingLeft: () => 6,
  paddingRight: () => 6,
}
