export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand brand-official'}>
      <img
        src={compact ? './brand/viyeutica-mark.svg' : './brand/viyeutica-logo.svg'}
        alt={compact ? 'Viyeutica' : 'Logo de Viyeutica'}
      />
    </div>
  )
}
