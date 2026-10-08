import { MEAL_LABEL, type MealCount, type MealKey, type Target } from '@/lib/meal-sheet'

const n = (v: number | null | undefined) => (v == null ? '—' : String(v))

function row(label: string, value: number | null | undefined, opts: { bold?: boolean; color?: string; unit?: string } = {}) {
  return {
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#6B7280', flex: 3 },
      { type: 'text', text: n(value) + (opts.unit && value != null ? opts.unit : ''), size: opts.bold ? 'xl' : 'md', weight: 'bold', color: opts.color ?? '#111827', align: 'end', flex: 1 },
    ],
  }
}

function section(title: string, rows: unknown[]) {
  return [
    { type: 'separator', margin: 'lg' },
    { type: 'text', text: title, size: 'sm', weight: 'bold', color: '#10B981', margin: 'lg' },
    { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'sm', contents: rows },
  ]
}

const NOTE_ESTIMATE = '預估值：旅客人數與用餐時段，待客人辦理入住後，以晚班回報為準。'
const NOTE_REPORTED = '依櫃台晚班回報，尚有異動時以櫃台為準。'

export function buildCard(c: MealCount, t: Target) {
  const isB = c.meal === 'breakfast'
  const body: unknown[] = [
    { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      row(isB ? '葷食總人數' : '葷食人數', c.meat, { bold: true }),
      row(isB ? '素食總人數' : '素食人數', c.veg, { bold: true }),
      ...(c.staple != null ? [row('主食份數', c.staple)] : []),
      ...(c.vegSoup != null ? [row('素食湯', c.vegSoup)] : []),
      ...(c.extra != null ? [row('附餐加點（荷包蛋）', c.extra)] : []),
    ] },
  ]
  if (c.batch1) body.push(...section('第一批次', [
    row('葷食人數', c.batch1.meat), row('主食份數', c.batch1.staple),
    row('不吃豬肉', c.batch1.pork), row('素食人數', c.batch1.veg),
  ]))
  if (c.batch2) body.push(...section('第二批次', [
    row('葷食人數', c.batch2.meat), row('不吃豬肉', c.batch2.pork), row('素食人數', c.batch2.veg),
  ]))
  if (c.guestSlots) {
    // 預估階段時段常尚未填寫：全 0 時不顯示四行「0 位」，避免被誤解為「沒有旅客」
    const unreported = t.phase === 'estimate' && c.guestSlots.every(g => g.count === 0)
    body.push(...section('旅客用餐時段', unreported
      ? [{ type: 'text', text: '旅客用餐時段尚未回報', size: 'sm', color: '#9CA3AF' }]
      : c.guestSlots.map(g => row(g.time, g.count, { unit: ' 位' }))))
  }
  if (isB) {
    body.push({ type: 'text', text: t.phase === 'estimate' ? NOTE_ESTIMATE : NOTE_REPORTED, size: 'xs', color: '#9CA3AF', wrap: true, margin: 'lg' })
  }

  return {
    type: 'flex',
    altText: `${c.dateLabel} ${MEAL_LABEL[c.meal]}用餐人數：葷 ${n(c.meat)}／素 ${n(c.veg)}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#10B981', paddingAll: 'lg',
        contents: [
          { type: 'text', text: `${MEAL_LABEL[c.meal]}用餐人數`, color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: `${c.dateLabel}・${t.dayTag}　來源：安心家園用餐總表`, color: '#D1FAE5', size: 'xs', margin: 'xs', wrap: true },
        ],
      },
      body: { type: 'box', layout: 'vertical', contents: body },
    },
    quickReply: {
      items: (['breakfast', 'lunch', 'dinner'] as MealKey[]).map(k => ({
        type: 'action',
        action: { type: 'postback', label: MEAL_LABEL[k], data: `meal=${k}` },
      })),
    },
  }
}
