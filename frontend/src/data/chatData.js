const MS_PER_DAY = 86_400_000

export const getGroup = (timestamp) => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday - MS_PER_DAY)
  const startOf7DaysAgo = new Date(startOfToday - 7 * MS_PER_DAY)

  const d = new Date(timestamp)
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (startOfDay >= startOfToday) return 'today'
  if (startOfDay >= startOfYesterday) return 'yesterday'
  if (startOfDay >= startOf7DaysAgo) return 'previous7Days'
  return 'older'
}

export const GROUP_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  previous7Days: 'Previous 7 Days',
  older: 'Older',
}

export const GROUP_ORDER = ['today', 'yesterday', 'previous7Days', 'older']
