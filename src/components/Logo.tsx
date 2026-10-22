export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand'}>
      <img src="./brand/viyeutica-icon.svg" alt="" />
      {!compact && <span>viyeutica</span>}
    </div>
  )
}
