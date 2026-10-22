export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand brand-official'}>
      <img
        src={compact ? './brand/viyeutica-mark.webp' : './brand/viyeutica-logo.webp'}
        alt={compact ? 'Viyeutica' : 'Logo de Viyeutica'}
      />
    </div>
  )
}
