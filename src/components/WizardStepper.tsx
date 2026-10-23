import {
  BookOpen, CalendarClock, CheckCircle2, GraduationCap, LayoutGrid, LockKeyhole,
  ShieldCheck, SlidersHorizontal, Sparkles, Users,
} from 'lucide-react'
import {
  isCenterComplete,
  isScheduleComplete,
  isStructureComplete,
  isStudyPlanComplete,
  isStaffComplete,
  isAssignmentsComplete,
  isRulesComplete,
  type ViyeuticaProject,
} from '../domain/project'

const steps = [
  { number:1, label:'Centro', icon:GraduationCap, route:'/centro' },
  { number:2, label:'Estructura y grupos', icon:LayoutGrid, route:'/grupos' },
  { number:3, label:'Jornada y sesiones', icon:CalendarClock, route:'/jornada' },
  { number:4, label:'Plan de estudios', icon:BookOpen, route:'/materias' },
  { number:5, label:'Profesorado', icon:Users, route:'/profesorado' },
  { number:6, label:'Asignaciones', icon:SlidersHorizontal, route:'/asignaciones' },
  { number:7, label:'Reglas', icon:ShieldCheck, route:'/reglas' },
  { number:8, label:'Prevalidación', icon:CheckCircle2, route:null },
  { number:9, label:'Generación', icon:Sparkles, route:null },
] as const

export function WizardStepper({
  currentStep,
  project,
  navigate,
}: {
  currentStep:number
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  const completed:Record<number,boolean> = {
    1:isCenterComplete(project.center),
    2:isStructureComplete(project),
    3:isScheduleComplete(project),
    4:isStudyPlanComplete(project),
    5:isStaffComplete(project),
    6:isAssignmentsComplete(project),
    7:isRulesComplete(project),
  }

  return (
    <section className="wizard-stepper" aria-label="Pasos de configuración">
      {steps.map(step => {
        const Icon=step.icon
        const active=step.number===currentStep
        const available=Boolean(step.route)
        const done=Boolean(completed[step.number])
        const status=active
          ? (done?'Completo':'En curso')
          : available
            ? (done?'Completo':'Disponible')
            : 'Próximamente'
        const className='wizard-step '+(
          active?'active':
          done?'done':
          available?'available':
          'locked'
        )

        return (
          <button
            type="button"
            className={className}
            key={step.number}
            onClick={() => step.route && navigate(step.route)}
            disabled={!available}
            aria-current={active?'step':undefined}
            title={available ? `Ir a ${step.number}. ${step.label}` : `${step.label}: todavía no disponible`}
          >
            <span className="wizard-step-icon">
              {done && !active ? <CheckCircle2 size={16}/> : available ? <Icon size={16}/> : <LockKeyhole size={14}/>}
            </span>
            <span>
              <strong>{step.number}. {step.label}</strong>
              <small>{status}</small>
            </span>
          </button>
        )
      })}
    </section>
  )
}
