import { useMemo, useState } from 'react'
import {
  AlertTriangle, CalendarDays, CheckCircle2, Clock3, RefreshCcw, Sparkles,
  Trophy, XCircle,
} from 'lucide-react'
import {
  isPrevalidationComplete,
  latestGeneration,
  type GenerationRun,
  type ViyeuticaProject,
  type Weekday,
} from '../domain/project'
import { generateSchedule } from '../domain/generationEngine'
import { saveProject } from '../store/projectStorage'
import { WizardStepper } from '../components/WizardStepper'

const dayLabels:Record<Weekday,string>={
  L:'Lunes',M:'Martes',X:'Miércoles',J:'Jueves',V:'Viernes',S:'Sábado',
}

export function GenerationPage({
  project,
  navigate,
}:{
  project:ViyeuticaProject
  navigate:(path:string)=>void
}) {
  const [selectedRunId,setSelectedRunId]=useState(latestGeneration(project)?.id??'')
  const [selectedGroupId,setSelectedGroupId]=useState(project.groups.find(group=>group.active)?.id??'')
  const [running,setRunning]=useState(false)

  const runs=project.generationRuns
  const selectedRun=runs.find(run=>run.id===selectedRunId)??latestGeneration(project)
  const activeGroups=project.groups.filter(group=>group.active)
  const teachingBlocks=project.schedule.blocks.filter(block=>block.active&&block.type==='teaching')

  const runGeneration=()=>{
    if(!isPrevalidationComplete(project)) return
    setRunning(true)
    window.setTimeout(()=>{
      const result=generateSchedule(project,60)
      saveProject({...project,generationRuns:[...project.generationRuns,result]})
      setSelectedRunId(result.id)
      setRunning(false)
    },20)
  }

  const clearRuns=()=>{
    if(!window.confirm('¿Eliminar las propuestas de horario generadas? La configuración del centro no se modificará.')) return
    saveProject({...project,generationRuns:[]})
    setSelectedRunId('')
  }

  if(!isPrevalidationComplete(project)){
    return <section className="empty-state-card">
      <Sparkles size={34}/>
      <h1>Primero debe superarse la Prevalidación</h1>
      <p>Generación solo se habilita cuando no existen errores bloqueantes en los pasos anteriores.</p>
      <button className="btn primary" onClick={()=>navigate('/prevalidacion')}>Ir a Prevalidación</button>
    </section>
  }

  return <div className="wizard-page generation-page">
    <section className="wizard-intro">
      <div>
        <span className="eyebrow dark"><Sparkles size={15}/> Paso 9 · Construcción del horario</span>
        <h1>Generación</h1>
        <p>Construye propuestas utilizando asignaciones, disponibilidades y reglas activas. Las condiciones HARD restringen la colocación; las SOFT puntúan y permiten comparar soluciones.</p>
      </div>
      <div className="wizard-progress-summary"><strong>9 <span>de 9</span></strong><small>Generación</small></div>
    </section>

    <WizardStepper currentStep={9} project={project} navigate={navigate}/>

    <section className="generation-control-card">
      <div>
        <span className="panel-kicker">Motor heurístico</span>
        <h2>Generar nueva propuesta</h2>
        <p>Viyeutica probará hasta 60 distribuciones y conservará la mejor según cumplimiento HARD y penalización SOFT.</p>
      </div>
      <div className="generation-control-actions">
        {runs.length>0&&<button className="btn ghost-inline" onClick={clearRuns}>Limpiar propuestas</button>}
        <button className="btn primary" disabled={running} onClick={runGeneration}>
          {running?<RefreshCcw className="spin" size={16}/>:<Sparkles size={16}/>}
          {running?'Generando...':'Generar propuesta'}
        </button>
      </div>
    </section>

    {runs.length===0
      ? <section className="generation-empty">
          <CalendarDays size={38}/>
          <h2>Todavía no hay propuestas</h2>
          <p>Ejecuta el generador para crear la primera distribución semanal.</p>
        </section>
      : <>
        <section className="generation-history">
          <div className="groups-table-heading">
            <div><span className="panel-kicker">Historial</span><h2>Propuestas generadas</h2></div>
          </div>
          <div className="generation-run-list">
            {[...runs].reverse().map((run,index)=><RunCard
              key={run.id}
              run={run}
              best={isBestRun(run,runs)}
              selected={run.id===selectedRun?.id}
              label={`Propuesta ${runs.length-index}`}
              onClick={()=>setSelectedRunId(run.id)}
            />)}
          </div>
        </section>

        {selectedRun&&<section className="generation-result">
          <div className="generation-result-heading">
            <div>
              <span className="panel-kicker">Resultado seleccionado</span>
              <h2>{selectedRun.status==='complete'?'Horario completo':selectedRun.status==='partial'?'Horario parcial':'Generación fallida'}</h2>
              <p>{new Date(selectedRun.createdAt).toLocaleString('es-ES')}</p>
            </div>
            <div className="generation-score"><Trophy size={18}/><strong>{selectedRun.score}</strong><small>puntuación</small></div>
          </div>

          <section className="structure-summary">
            <Summary label="Sesiones colocadas" value={String(selectedRun.placedSessions)} detail={`de ${selectedRun.requestedSessions} solicitadas`}/>
            <Summary label="Incumplimientos HARD" value={String(selectedRun.hardViolations)} detail={selectedRun.hardViolations?'requieren revisión':'sin bloqueos'}/>
            <Summary label="Penalización SOFT" value={String(selectedRun.softPenalty)} detail="menor es mejor"/>
            <Summary label="Estado" value={selectedRun.status==='complete'?'Completo':selectedRun.status==='partial'?'Parcial':'Fallido'} detail="resultado del motor"/>
          </section>

          {selectedRun.notes.length>0&&<div className="generation-notes">
            <AlertTriangle size={18}/>
            <div><strong>Incidencias de generación</strong>{selectedRun.notes.slice(0,8).map((note,index)=><p key={index}>{note}</p>)}</div>
          </div>}

          <div className="generation-toolbar">
            <label>Ver horario de
              <select value={selectedGroupId} onChange={e=>setSelectedGroupId(e.target.value)}>
                {activeGroups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <button className="btn ghost-inline" onClick={()=>navigate('/horarios')}>Abrir módulo Horarios</button>
          </div>

          <SchedulePreview project={project} run={selectedRun} groupId={selectedGroupId}/>
        </section>}
      </>}
  </div>
}

function RunCard({
  run,best,selected,label,onClick,
}:{
  run:GenerationRun
  best:boolean
  selected:boolean
  label:string
  onClick:()=>void
}) {
  const Icon=run.status==='complete'?CheckCircle2:run.status==='partial'?AlertTriangle:XCircle
  return <button className={'generation-run-card '+(selected?'selected ':'')+run.status} onClick={onClick}>
    <Icon size={18}/>
    <span className="generation-run-main">
      <strong>{label}{best&&<em>Mejor</em>}</strong>
      <small>{run.placedSessions}/{run.requestedSessions} sesiones · HARD {run.hardViolations} · SOFT {run.softPenalty}</small>
    </span>
    <span className="generation-run-score">{run.score}</span>
  </button>
}

function SchedulePreview({project,run,groupId}:{project:ViyeuticaProject;run:GenerationRun;groupId:string}) {
  const teachingBlocks=project.schedule.blocks.filter(block=>block.active&&block.type==='teaching')
  const entries=run.entries.filter(entry=>entry.groupId===groupId)
  return <div className="generated-schedule-wrap">
    <table className="generated-schedule">
      <thead><tr><th>Sesión</th>{project.schedule.activeDays.map(day=><th key={day}>{dayLabels[day]}</th>)}</tr></thead>
      <tbody>{teachingBlocks.map(block=><tr key={block.id}>
        <th><strong>{block.label}</strong><small>{block.start}–{block.end}</small></th>
        {project.schedule.activeDays.map(day=>{
          const cell=entries.filter(entry=>entry.day===day&&entry.sessionId===block.id)
          const primary=cell[0]
          if(!primary)return <td key={day} className="empty-slot">—</td>
          const subject=project.subjects.find(item=>item.id===primary.subjectId)
          const teachers=cell.map(entry=>project.teachers.find(item=>item.id===entry.teacherId)?.name).filter(Boolean)
          return <td key={day}>
            <strong>{subject?.name??'Materia'}</strong>
            <small>{teachers.join(' + ')}</small>
          </td>
        })}
      </tr>)}</tbody>
    </table>
  </div>
}

function isBestRun(run:GenerationRun,runs:GenerationRun[]){
  const best=[...runs].sort((a,b)=>a.hardViolations-b.hardViolations||b.score-a.score)[0]
  return best?.id===run.id
}
function Summary({label,value,detail}:{label:string;value:string;detail:string}){return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>}
