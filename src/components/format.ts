const groupedPrice = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const groupedInteger = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export const formatPrice = (n: number): string => n.toFixed(2)
export const formatPriceGrouped = (n: number): string => groupedPrice.format(n)
export const formatSize = (n: number): string => n.toFixed(4)
export const formatVolume = (n: number): string => groupedInteger.format(n)
