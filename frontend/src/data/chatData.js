const MS_PER_DAY = 86_400_000

// Returns 'today', 'yesterday', or a 'YYYY-MM-DD' string for older dates
export const getGroup = (timestamp) => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday - MS_PER_DAY)

  const d = new Date(timestamp)
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (startOfDay >= startOfToday) return 'today'
  if (startOfDay >= startOfYesterday) return 'yesterday'
  return startOfDay.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

// Returns a human-readable label for any group key
export const getGroupLabel = (key) => {
  if (key === 'today') return 'Today'
  if (key === 'yesterday') return 'Yesterday'
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const opts = date.getFullYear() === new Date().getFullYear()
    ? { month: 'long', day: 'numeric' }
    : { month: 'long', day: 'numeric', year: 'numeric' }
  return date.toLocaleDateString('en-US', opts)
}

// Sort group keys: today → yesterday → date strings descending
export const sortGroupKeys = (keys) =>
  [...keys].sort((a, b) => {
    if (a === 'today') return -1
    if (b === 'today') return 1
    if (a === 'yesterday') return -1
    if (b === 'yesterday') return 1
    return b.localeCompare(a) // ISO strings sort lexicographically = chronologically
  })
