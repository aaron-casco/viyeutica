import {
  AlertTriangle, ArrowRight, BookOpenCheck, CalendarClock, CalendarDays, CheckCircle2,
  Clock3, GraduationCap, LayoutGrid, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import { isCenterComplete, isStructureComplete, isScheduleComplete, type ViyeuticaProject } from '../domain/project'

export function Dashboard({
  navigate,
  project,
}: {
  navigate:(path:string)=>void
  project: ViyeuticaProject
}) {
  const centerDone = isCenterComplete(project.center)
  const structureDone = isStructureComplete(project)
  const scheduleDone = isScheduleComplete(project)
  const activeGroups = project.groups.filter(group => group.active)
  const students = activeGroups.reduce((sum,group) => sum + (group.students ?? 0),0)
  const teachingSessions = project.schedule.blocks.filter(block => block.active && block.type === 'teaching').length

  const setup = [
    ['Datos del centro', centerDone ? 'done' : 'progress'],
    ['Estructura y grupos', structureDone ? 'done' : centerDone ? 'progress' : 'pending'],
    ['Jornada y sesiones', scheduleDone ? 'done' : structureDone ? 'progress' : 'pending'],
    ['Plan de estudios','pending'],
    ['Profesorado','pending'],
    ['Reglas y prevalidación','pending'],
  ] as const

  const progress = scheduleDone ? 33 : structureDone ? 22 : centerDone ? 11 : 0
  const nextRoute = !centerDone ? '/configuracion' : !structureDone ? '/grupos' : '/jornada'

  return <div className="dashboard-stack">
    <section className="hero-card">
      <div>
        <span className="eyebrow"><Sparkles size={15}/> Viyeutica 0.4</span>
        <h1>{scheduleDone ? 'La rejilla temporal del centro ya está lista.' : structureDone ? 'Ahora toca definir la jornada escolar.' : centerDone ? 'Ahora toca construir la estructura académica.' : 'Configura el centro antes de construir el horario.'}</h1>
        <p>{scheduleDone
          ? `${project.center.name} · ${activeGroups.length} grupos · ${teachingSessions} sesiones lectivas diarias configuradas.`
          : structureDone
            ? 'Define días lectivos, sesiones, recreos y duraciones. Esa será la base temporal del generador.'
            : centerDone
              ? 'Define niveles, líneas y grupos reales. Viyeutica utilizará esta estructura para jornada, materias, profesorado y solver.'
              : 'Introduce los datos maestros del centro. Viyeutica los conservará en este navegador y los reutilizará en todo el flujo.'}</p>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => navigate(nextRoute)}>{scheduleDone ? 'Revisar jornada' : 'Continuar configuración'} <ArrowRight size={17}/></button>
          <button className="btn secondary" onClick={() => navigate('/horarios')}>Ver módulo de horarios</button>
        </div>
      </div>
      <div className="hero-mark hero-logo-full"><img src="./brand/viyeutica-logo.svg" alt="Logo de Viyeutica"/></div>
    </section>

    <section className="metric-grid">
      <Metric icon={<LayoutGrid/>} label="Grupos" value={activeGroups.length ? String(activeGroups.length) : '—'} detail={activeGroups.length ? 'unidades activas' : 'pendientes de configurar'}/>
      <Metric icon={<Users/>} label="Alumnado" value={students ? String(students) : '—'} detail={students ? 'total agregado' : 'datos opcionales por grupo'}/>
      <Metric icon={<CalendarClock/>} label="Sesiones" value={teachingSessions ? String(teachingSessions) : '—'} detail={teachingSessions ? 'tramos lectivos diarios' : 'jornada pendiente'}/>
      <Metric icon={<CalendarDays/>} label="Curso" value={project.academicYear.label} detail="curso académico activo"/>
    </section>

    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Preparación</span><h2>Configuración del curso</h2></div><span className="status-pill warning">{progress}%</span></div>
        <div className="progress-track"><span style={{width:progress+'%'}}/></div>
        <div className="setup-list">{setup.map(([label,state]) => <div className="setup-row" key={label}><span className={'setup-dot '+state}>{state==='done'?<CheckCircle2 size={16}/>:state==='progress'?<Clock3 size={16}/>:<span/>}</span><span>{label}</span><span className={'setup-state '+state}>{state==='done'?'Completo':state==='progress'?'En progreso':'Pendiente'}</span></div>)}</div>
        <button className="text-action" onClick={() => navigate(nextRoute)}>Continuar configuración <ArrowRight size={16}/></button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Control</span><h2>Estado de auditoría</h2></div><ShieldCheck className="panel-heading-icon" size={24}/></div>
        <div className="audit-score"><div className="score-ring"><span>—</span></div><div><strong>Aún no ejecutada</strong><p>Se habilitará cuando exista un horario completo.</p></div></div>
        <div className="audit-mini-grid"><div><strong>0</strong><span>errores HARD</span></div><div><strong>0</strong><span>advertencias</span></div></div>
        <button className="btn ghost" onClick={() => navigate('/auditoria')}>Abrir auditoría</button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Siguiente paso</span><h2>{!centerDone ? 'Completar los datos del centro' : !structureDone ? 'Definir grupos y unidades' : !scheduleDone ? 'Configurar jornada y sesiones' : 'Preparar el plan de estudios'}</h2></div><GraduationCap className="panel-heading-icon" size={24}/></div>
        <p className="panel-copy">{!centerDone
          ? 'Primero necesitamos identificar el centro, su ubicación y las etapas que imparte.'
          : !structureDone
            ? 'Crea la estructura real por etapas, niveles y líneas.'
            : !scheduleDone
              ? 'Define los días lectivos y todos los tramos temporales, incluyendo sesiones y recreos.'
              : 'El siguiente bloque relacionará cada nivel con sus materias y cargas semanales.'}</p>
        <div className="notice amber"><AlertTriangle size={17}/><span>{scheduleDone ? 'El Paso 4 será el siguiente módulo.' : 'Completa este paso antes de seguir.'}</span></div>
        <button className="btn primary wide" onClick={() => navigate(nextRoute)}>{scheduleDone ? 'Revisar jornada' : 'Continuar'} <ArrowRight size={16}/></button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Accesos</span><h2>Trabajo frecuente</h2></div></div>
        <div className="quick-grid">
          <Quick icon={<Users/>} label="Profesorado" onClick={() => navigate('/profesorado')}/>
          <Quick icon={<LayoutGrid/>} label="Grupos" onClick={() => navigate('/grupos')}/>
          <Quick icon={<CalendarClock/>} label="Jornada" onClick={() => navigate('/jornada')}/>
          <Quick icon={<ShieldCheck/>} label="Auditoría" onClick={() => navigate('/auditoria')}/>
        </div>
      </article>
    </section>
  </div>
}

function Metric({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></article>
}
function Quick({icon,label,onClick}:{icon:React.ReactNode;label:string;onClick:()=>void}) {
  return <button className="quick-button" onClick={onClick}><span>{icon}</span><strong>{label}</strong></button>
}
