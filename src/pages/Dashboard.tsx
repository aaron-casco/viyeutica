import {
  AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2,
  Clock3, GraduationCap, LayoutGrid, ShieldCheck, Sparkles, Users,
} from 'lucide-react'

const setup = [
  ['Datos del centro','done'],
  ['Estructura y grupos','done'],
  ['Jornada y sesiones','done'],
  ['Plan de estudios','progress'],
  ['Profesorado','progress'],
  ['Reglas y prevalidación','pending'],
] as const

export function Dashboard({ navigate }: { navigate:(path:string)=>void }) {
  return <div className="dashboard-stack">
    <section className="hero-card">
      <div>
        <span className="eyebrow"><Sparkles size={15}/> Viyeutica 0.1</span>
        <h1>Organiza el centro. Genera el horario. Comprueba que encaja.</h1>
        <p>Configura grupos, profesorado, materias y restricciones antes de generar una propuesta auditable.</p>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => navigate('/configuracion')}>Continuar configuración <ArrowRight size={17}/></button>
          <button className="btn secondary" onClick={() => navigate('/horarios')}>Ver horarios</button>
        </div>
      </div>
      <div className="hero-mark"><img src="./brand/viyeutica-icon.svg" alt="Símbolo de Viyeutica"/></div>
    </section>

    <section className="metric-grid">
      <Metric icon={<LayoutGrid/>} label="Grupos" value="9" detail="3 Infantil · 6 Primaria"/>
      <Metric icon={<Users/>} label="Profesorado" value="18" detail="tutores y especialistas"/>
      <Metric icon={<BookOpenCheck/>} label="Requisitos" value="64" detail="materias y actividades"/>
      <Metric icon={<CalendarDays/>} label="Sesiones" value="225" detail="semanales a organizar"/>
    </section>

    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-heading"><div><span className="panel-kicker">Preparación</span><h2>Configuración del curso</h2></div><span className="status-pill warning">62%</span></div>
        <div className="progress-track"><span style={{width:'62%'}}/></div>
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
        <div className="panel-heading"><div><span className="panel-kicker">Siguiente paso</span><h2>Completar plan de estudios</h2></div><GraduationCap className="panel-heading-icon" size={24}/></div>
        <p className="panel-copy">Revisa cargas semanales y asigna qué materias requieren especialista, codocencia o una duración concreta.</p>
        <div className="notice amber"><AlertTriangle size={17}/><span>12 requisitos necesitan revisión antes del precheck.</span></div>
        <button className="btn primary wide" onClick={() => navigate('/materias')}>Revisar materias <ArrowRight size={16}/></button>
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
