import {
  AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2,
  Clock3, GraduationCap, LayoutGrid, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import { isCenterComplete, type ViyeuticaProject } from '../domain/project'

export function Dashboard({
  navigate,
  project,
}: {
  navigate:(path:string)=>void
  project: ViyeuticaProject
}) {
  const centerDone = isCenterComplete(project.center)
  const setup = [
    ['Datos del centro', centerDone ? 'done' : 'progress'],
    ['Estructura y grupos','pending'],
    ['Jornada y sesiones','pending'],
    ['Plan de estudios','pending'],
    ['Profesorado','pending'],
    ['Reglas y prevalidación','pending'],
  ] as const
  const progress = centerDone ? 11 : 0

  return <div className="dashboard-stack">
    <section className="hero-card">
      <div>
        <span className="eyebrow"><Sparkles size={15}/> Viyeutica 0.2</span>
        <h1>{centerDone ? 'El centro ya está creado. Sigamos construyendo su horario.' : 'Configura el centro antes de construir el horario.'}</h1>
        <p>{centerDone
          ? `${project.center.name} · ${project.academicYear.label}. El siguiente bloque será la estructura de grupos y unidades.`
          : 'Introduce los datos maestros del centro. Viyeutica los conservará en este navegador y los reutilizará en todo el flujo.'}</p>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => navigate('/configuracion')}>{centerDone ? 'Revisar configuración' : 'Empezar configuración'} <ArrowRight size={17}/></button>
          <button className="btn secondary" onClick={() => navigate('/horarios')}>Ver módulo de horarios</button>
        </div>
      </div>
      <div className="hero-mark"><img src="./brand/viyeutica-icon.svg" alt="Símbolo de Viyeutica"/></div>
    </section>

    <section className="metric-grid">
      <Metric icon={<LayoutGrid/>} label="Grupos" value="—" detail="se configurarán en el paso 2"/>
      <Metric icon={<Users/>} label="Profesorado" value="—" detail="se configurará en el paso 5"/>
      <Metric icon={<BookOpenCheck/>} label="Materias" value="—" detail="plan de estudios pendiente"/>
      <Metric icon={<CalendarDays/>} label="Curso" value={project.academicYear.label} detail="curso académico activo"/>
    </section>

    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Preparación</span><h2>Configuración del curso</h2></div><span className="status-pill warning">{progress}%</span></div>
        <div className="progress-track"><span style={{width:progress+'%'}}/></div>
        <div className="setup-list">{setup.map(([label,state]) => <div className="setup-row" key={label}><span className={'setup-dot '+state}>{state==='done'?<CheckCircle2 size={16}/>:state==='progress'?<Clock3 size={16}/>:<span/>}</span><span>{label}</span><span className={'setup-state '+state}>{state==='done'?'Completo':state==='progress'?'En progreso':'Pendiente'}</span></div>)}</div>
        <button className="text-action" onClick={() => navigate('/configuracion')}>Abrir asistente <ArrowRight size={16}/></button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Control</span><h2>Estado de auditoría</h2></div><ShieldCheck className="panel-heading-icon" size={24}/></div>
        <div className="audit-score"><div className="score-ring"><span>—</span></div><div><strong>Aún no ejecutada</strong><p>Se habilitará cuando exista un horario completo.</p></div></div>
        <div className="audit-mini-grid"><div><strong>0</strong><span>errores HARD</span></div><div><strong>0</strong><span>advertencias</span></div></div>
        <button className="btn ghost" onClick={() => navigate('/auditoria')}>Abrir auditoría</button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Siguiente paso</span><h2>{centerDone ? 'Definir grupos y unidades' : 'Completar los datos del centro'}</h2></div><GraduationCap className="panel-heading-icon" size={24}/></div>
        <p className="panel-copy">{centerDone
          ? 'Crearemos la estructura académica real: etapas, niveles, líneas, grupos, alumnado agregado y tutorías.'
          : 'El generador no debe trabajar con supuestos. Primero necesitamos identificar el centro, su ubicación y las etapas que imparte.'}</p>
        <div className="notice amber"><AlertTriangle size={17}/><span>{centerDone ? 'El paso 2 todavía no está implementado.' : 'Los campos obligatorios deben completarse antes de continuar.'}</span></div>
        <button className="btn primary wide" onClick={() => navigate(centerDone ? '/grupos' : '/configuracion')}>{centerDone ? 'Ir a grupos' : 'Configurar centro'} <ArrowRight size={16}/></button>
      </article>

      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Accesos</span><h2>Trabajo frecuente</h2></div></div>
        <div className="quick-grid">
          <Quick icon={<Users/>} label="Profesorado" onClick={() => navigate('/profesorado')}/>
          <Quick icon={<LayoutGrid/>} label="Grupos" onClick={() => navigate('/grupos')}/>
          <Quick icon={<CalendarDays/>} label="Horarios" onClick={() => navigate('/horarios')}/>
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
