import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Save, Sparkles,
} from 'lucide-react'
import {
  isCenterComplete,
  type CenterData,
  type CenterType,
  type EducationStage,
  type Ownership,
  type ViyeuticaProject,
} from '../domain/project'
import { saveProject } from '../store/projectStorage'
import { WizardStepper } from '../components/WizardStepper'
import { TemplatePanel } from '../components/TemplatePanel'

const stages: EducationStage[] = ['Infantil', 'Primaria', 'ESO', 'Bachillerato']
const ownershipOptions: { value: Ownership; label: string }[] = [
  { value: 'publico', label: 'Público' },
  { value: 'concertado', label: 'Concertado' },
  { value: 'privado', label: 'Privado' },
]
const centerTypes: { value: CenterType; label: string }[] = [
  { value: 'CEIP', label: 'CEIP · Infantil y Primaria' },
  { value: 'IES', label: 'IES · Secundaria' },
  { value: 'CEIPSO', label: 'CEIPSO · Infantil, Primaria y Secundaria' },
  { value: 'CRA', label: 'CRA · Colegio Rural Agrupado' },
  { value: 'COLEGIO', label: 'Colegio' },
  { value: 'OTRO', label: 'Otro centro' },
]

type Errors = Partial<Record<keyof CenterData | 'stages', string>>

export function SetupWizard({
  project,
  navigate,
}: {
  project: ViyeuticaProject
  navigate: (path: string) => void
}) {
  const [form, setForm] = useState<CenterData>(() => ({ ...project.center, stages: [...project.center.stages] }))
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)

  const complete = useMemo(() => isCenterComplete(form), [form])

  const setField = <K extends keyof CenterData>(key: K, value: CenterData[K]) => {
    setSaved(false)
    setForm(current => ({ ...current, [key]: value }))
    if (errors[key]) setErrors(current => ({ ...current, [key]: undefined }))
  }

  const toggleStage = (stage: EducationStage) => {
    const next = form.stages.includes(stage)
      ? form.stages.filter(item => item !== stage)
      : [...form.stages, stage]
    setField('stages', next)
  }

  const applyCenterTemplate = (centerType: CenterType, templateStages: EducationStage[]) => {
    setSaved(false)
    setErrors({})
    setForm(current => ({
      ...current,
      centerType,
      ownership: current.ownership || 'publico',
      stages: templateStages,
    }))
  }

  const validate = () => {
    const next: Errors = {}
    if (!form.name.trim()) next.name = 'Introduce el nombre oficial del centro.'
    if (!form.officialCode.trim()) next.officialCode = 'Introduce el código oficial del centro.'
    if (!form.ownership) next.ownership = 'Selecciona la titularidad.'
    if (!form.centerType) next.centerType = 'Selecciona el tipo de centro.'
    if (!form.autonomousCommunity.trim()) next.autonomousCommunity = 'Indica la comunidad autónoma.'
    if (!form.province.trim()) next.province = 'Indica la provincia.'
    if (!form.locality.trim()) next.locality = 'Indica la localidad.'
    if (!form.stages.length) next.stages = 'Selecciona al menos una etapa educativa.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const persist = () => {
    if (!validate()) return false
    saveProject({ ...project, center: { ...form, name: form.name.trim(), officialCode: form.officialCode.trim() } })
    setSaved(true)
    return true
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (persist()) navigate('/grupos')
  }

  return (
    <div className="wizard-page">
      <section className="wizard-intro">
        <div>
          <h1 className="wizard-page-title"><Sparkles size={28}/> Prepara el curso {project.academicYear.label}</h1>
          <p>⩒Yeutika usará estos datos como base para grupos, profesorado, reglas, generación y auditoría del horario.</p>
        </div>
        <div className="wizard-progress-summary">
          <strong>1 <span>de 9</span></strong>
          <small>Datos del centro</small>
        </div>
      </section>

      <WizardStepper currentStep={1} project={project} navigate={navigate}/>

      <form className="wizard-layout" onSubmit={submit}>
        <section className="form-card">
          <div className="form-card-heading">
            <div className="form-card-number">01</div>
            <div>
              <span className="panel-kicker">Datos maestros</span>
              <h2>Datos del centro</h2>
              <p>Información identificativa y etapas que imparte el centro.</p>
            </div>
          </div>

          <div className="form-grid two">
            <Field label="Nombre oficial del centro" required error={errors.name} wide>
              <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Ej. CEIP Santa María del Prado" autoComplete="organization"/>
            </Field>
            <Field label="Código oficial del centro" required error={errors.officialCode}>
              <input value={form.officialCode} onChange={e => setField('officialCode', e.target.value)} placeholder="Ej. 0600XXXX"/>
            </Field>
            <Field label="Titularidad" required error={errors.ownership}>
              <select value={form.ownership} onChange={e => setField('ownership', e.target.value as Ownership)}>
                <option value="">Selecciona...</option>
                {ownershipOptions.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Tipo de centro" required error={errors.centerType}>
              <select value={form.centerType} onChange={e => setField('centerType', e.target.value as CenterType)}>
                <option value="">Selecciona...</option>
                {centerTypes.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="form-section-title">
            <h3>Ubicación</h3>
            <p>Se utilizará más adelante para seleccionar el paquete normativo aplicable.</p>
          </div>
          <div className="form-grid three">
            <Field label="Comunidad autónoma" required error={errors.autonomousCommunity}>
              <input value={form.autonomousCommunity} onChange={e => setField('autonomousCommunity', e.target.value)} />
            </Field>
            <Field label="Provincia" required error={errors.province}>
              <input value={form.province} onChange={e => setField('province', e.target.value)} placeholder="Ej. Badajoz"/>
            </Field>
            <Field label="Localidad" required error={errors.locality}>
              <input value={form.locality} onChange={e => setField('locality', e.target.value)} placeholder="Ej. La Roca de la Sierra"/>
            </Field>
          </div>

          <div className="form-section-title">
            <h3>Etapas educativas</h3>
            <p>Marca todas las etapas que deben participar en la planificación.</p>
          </div>
          <div className="stage-grid">
            {stages.map(stage => {
              const selected = form.stages.includes(stage)
              return <button type="button" className={'stage-option ' + (selected ? 'selected' : '')} onClick={() => toggleStage(stage)} key={stage}>
                <span className="stage-check">{selected && <Check size={15}/>}</span>
                <span><strong>{stage}</strong><small>{stage === 'Infantil' ? 'Segundo ciclo' : stage === 'Primaria' ? '1.º a 6.º' : stage === 'ESO' ? '1.º a 4.º' : '1.º y 2.º'}</small></span>
              </button>
            })}
          </div>
          {errors.stages && <p className="field-error standalone">{errors.stages}</p>}

          <div className="form-actions">
            <button type="button" className="btn secondary-light" onClick={() => navigate('/')}><ArrowLeft size={16}/> Volver al inicio</button>
            <div className="form-actions-right">
              {saved && <span className="save-confirmation"><CheckCircle2 size={16}/> Guardado</span>}
              <button type="button" className="btn ghost-inline" onClick={persist}><Save size={16}/> Guardar</button>
              <button type="submit" className="btn primary">Guardar y continuar <ArrowRight size={16}/></button>
            </div>
          </div>
        </section>

        <aside className="wizard-aside">
          <TemplatePanel
            title="Tipo de centro"
            description="Rellena tipo, titularidad pública si aún no está indicada y etapas habituales. No modifica nombre, código ni ubicación."
            actions={[
              {id:'ceip',label:'Plantilla CEIP',description:'Infantil + Primaria',onApply:()=>applyCenterTemplate('CEIP',['Infantil','Primaria'])},
              {id:'ies',label:'Plantilla IES',description:'ESO + Bachillerato',onApply:()=>applyCenterTemplate('IES',['ESO','Bachillerato'])},
              {id:'ceipso',label:'Plantilla CEIPSO',description:'Infantil + Primaria + ESO',onApply:()=>applyCenterTemplate('CEIPSO',['Infantil','Primaria','ESO'])},
              {id:'cra',label:'Plantilla CRA',description:'Infantil + Primaria',onApply:()=>applyCenterTemplate('CRA',['Infantil','Primaria'])},
            ]}
          />
          <article className="aside-card">
            <span className="panel-kicker">Curso activo</span>
            <strong>{project.academicYear.label}</strong>
            <p>Los datos de configuración quedan asociados al curso académico activo.</p>
          </article>
          <article className={'aside-card validation ' + (complete ? 'ready' : '')}>
            <span className="panel-kicker">Estado</span>
            <strong>{complete ? 'Paso listo' : 'Faltan datos'}</strong>
            <p>{complete ? 'Puedes guardar y continuar al siguiente bloque.' : 'Completa los campos obligatorios marcados con *.'}</p>
          </article>
          <article className="aside-card info">
            <span className="panel-kicker">Privacidad</span>
            <strong>Prototipo local</strong>
            <p>En esta fase los datos se guardan únicamente en este navegador. No se envían a un servidor.</p>
          </article>
        </aside>
      </form>
    </div>
  )
}

function Field({
  label, required, error, wide, children,
}: {
  label: string
  required?: boolean
  error?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return <label className={'form-field ' + (wide ? 'wide' : '')}>
    <span>{label}{required && <em>*</em>}</span>
    {children}
    {error && <small className="field-error">{error}</small>}
  </label>
}
