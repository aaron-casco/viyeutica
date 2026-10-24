import { useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, CircleAlert, ClipboardCheck, Info, RefreshCcw,
  ShieldCheck, Sparkles,
} from 'lucide-react'
import {
  isRulesComplete,
  runPrevalidation,
  type PrevalidationIssue,
  type ViyeuticaProject,
} from '../domain/project'
import { WizardStepper } from '../components/WizardStepper'

export function PrevalidationPage({
  project,
  navigate,
}:{
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  const [version,setVersion]=useState(0)
  const issues=useMemo(()=>runPrevalidation(project),[project,version])
  const errors=issues.filter(issue=>issue.severity==='error')
  const warnings=issues.filter(issue=>issue.severity==='warning')
  const infos=issues.filter(issue=>issue.severity==='info')
  const ready=errors.length===0 && isRulesComplete(project)

  if(!isRulesComplete(project)){
    return <section className="empty-state-card">
      <ClipboardCheck size={34}/>
      <h1>Completa primero Reglas</h1>
      <p>La prevalidación necesita toda la configuración de los pasos 1–7 para poder comprobar el proyecto de forma transversal.</p>
      <button className="btn primary" onClick={()=>navigate('/reglas')}>Ir a Reglas</button>
    </section>
  }

  return <div className="wizard-page prevalidation-page">
    <section className="wizard-intro">
      <div>
        <h1 className="wizard-page-title"><ClipboardCheck size={28}/> Prevalidación</h1>
        <p>Comprueba la coherencia completa del proyecto antes de generar horarios. Los errores bloquean la generación; las advertencias requieren revisión; la información no bloquea.</p>
      </div>
      <div className="wizard-progress-summary"><strong>8 <span>de 9</span></strong><small>Prevalidación</small></div>
    </section>

    <WizardStepper currentStep={8} project={project} navigate={navigate}/>

    <section className="prevalidation-hero">
      <div className={'prevalidation-status '+(ready?'ready':'blocked')}>
        {ready?<CheckCircle2 size={34}/>:<CircleAlert size={34}/>}
        <div>
          <span className="panel-kicker">{ready?'Resultado':'Revisión necesaria'}</span>
          <h2>{ready?'Proyecto listo para generar':'La generación está bloqueada'}</h2>
          <p>{ready
            ? 'No se han detectado errores estructurales ni incumplimientos bloqueantes en la configuración actual.'
            : `Hay ${errors.length} errores que deben resolverse antes de generar un horario.`}</p>
        </div>
      </div>
      <button className="btn ghost-inline" onClick={()=>setVersion(value=>value+1)}><RefreshCcw size={15}/> Volver a comprobar</button>
    </section>

    <section className="structure-summary">
      <Summary label="Errores" value={String(errors.length)} detail="bloquean generación"/>
      <Summary label="Advertencias" value={String(warnings.length)} detail="requieren revisión"/>
      <Summary label="Información" value={String(infos.length)} detail="observaciones"/>
      <Summary label="Reglas activas" value={String(project.rules.filter(rule=>rule.active).length)} detail="HARD + SOFT"/>
    </section>

    <section className="prevalidation-sections">
      <IssueSection
        title="Errores que bloquean"
        description="Deben quedar a cero antes de permitir la generación."
        issues={errors}
        severity="error"
        project={project}
        navigate={navigate}
      />
      <IssueSection
        title="Advertencias"
        description="No bloquean automáticamente, pero conviene revisarlas antes de generar."
        issues={warnings}
        severity="warning"
        project={project}
        navigate={navigate}
      />
      <IssueSection
        title="Información"
        description="Observaciones sobre el estado del proyecto y preferencias activas."
        issues={infos}
        severity="info"
        project={project}
        navigate={navigate}
      />
    </section>

    <section className="prevalidation-rule-summary">
      <div>
        <ShieldCheck size={24}/>
        <span>
          <strong>Cómo se usan las reglas</strong>
          <small>Las HARD forman parte de los bloqueos y restricciones obligatorias. Las SOFT no invalidan el proyecto: se trasladarán al generador como preferencias ponderadas para comparar soluciones.</small>
        </span>
      </div>
      <div className="rule-counts">
        <span><strong>{project.rules.filter(rule=>rule.active&&rule.ruleType==='HARD').length}</strong><small>HARD</small></span>
        <span><strong>{project.rules.filter(rule=>rule.active&&rule.ruleType==='SOFT').length}</strong><small>SOFT</small></span>
      </div>
    </section>

    <section className="prevalidation-actions">
      <button className="btn secondary-light" onClick={()=>navigate('/reglas')}>Volver a Reglas</button>
      <button className="btn primary" disabled={!ready} onClick={()=>navigate('/generacion')}><Sparkles size={16}/> Ir a Generación</button>
    </section>
  </div>
}

function IssueSection({
  title,description,issues,severity,project,navigate,
}:{
  title:string
  description:string
  issues:PrevalidationIssue[]
  severity:'error'|'warning'|'info'
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  const Icon=severity==='error'?CircleAlert:severity==='warning'?AlertTriangle:Info
  return <section className={'prevalidation-card '+severity}>
    <div className="prevalidation-card-heading">
      <div><Icon size={20}/><span><strong>{title}</strong><small>{description}</small></span></div>
      <span className="prevalidation-count">{issues.length}</span>
    </div>
    {issues.length===0
      ? <div className="prevalidation-empty"><CheckCircle2 size={18}/><span>Sin incidencias</span></div>
      : <div className="prevalidation-issue-list">{issues.map(issue=><article key={issue.id}>
          <div>
            <div className="prevalidation-issue-meta"><span>{issue.section}</span><code>{issue.code}</code></div>
            <strong>{issue.message}</strong>
            {issue.detail&&<p>{issue.detail}</p>}
          </div>
          <button className="btn ghost-inline" onClick={()=>navigate(sectionRoute(issue.section))}>Revisar</button>
        </article>)}</div>}
  </section>
}

function sectionRoute(section:string){
  if(section==='Centro')return '/centro'
  if(section==='Estructura y grupos')return '/grupos'
  if(section==='Jornada y sesiones')return '/jornada'
  if(section==='Plan de estudios')return '/materias'
  if(section==='Profesorado')return '/profesorado'
  if(section==='Asignaciones')return '/asignaciones'
  if(section==='Reglas')return '/reglas'
  if(section==='Normativa')return '/normativa'
  return '/'
}

function Summary({label,value,detail}:{label:string;value:string;detail:string}){return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>}
