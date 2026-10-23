import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowDownUp, CalendarDays, CheckCircle2, Info, Plus, RefreshCcw, Sparkles,
  Trash2, Trophy, XCircle,
} from 'lucide-react'
import {
  generationDifference,
  generationSignature,
  isPrevalidationComplete,
  latestGeneration,
  uniqueGenerationRuns,
  type GenerationRun,
  type ViyeuticaProject,
  type Weekday,
} from '../domain/project'
import { generateSchedule } from '../domain/generationEngine'
import { saveProject } from '../store/projectStorage'
import { WizardStepper } from '../components/WizardStepper'
import { AppModal } from '../components/AppModal'

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
  const [selectedRunId,setSelectedRunId]=useState(project.selectedGenerationRunId??latestGeneration(project)?.id??'')
  const [selectedGroupIds,setSelectedGroupIds]=useState<string[]>(['all'])
  const [running,setRunning]=useState(false)
  const [showClearModal,setShowClearModal]=useState(false)
  const [showIssuesModal,setShowIssuesModal]=useState(false)
  const [ascending,setAscending]=useState(true)
  const [generationNotice,setGenerationNotice]=useState('')

  const runs=uniqueGenerationRuns(project.generationRuns)
  const selectedRun=runs.find(run=>run.id===selectedRunId)??runs[runs.length-1]??latestGeneration(project)
  const activeGroups=project.groups.filter(group=>group.active)
  const teachingBlocks=project.schedule.blocks.filter(block=>block.active&&block.type==='teaching')
  const baselineRun=runs[0]??null

  const toggleGroup=(groupId:string)=>{
    if(groupId==='all'){
      setSelectedGroupIds(['all'])
      return
    }
    setSelectedGroupIds(current=>{
      const withoutAll=current.filter(id=>id!=='all')
      const exists=withoutAll.includes(groupId)
      const next=exists?withoutAll.filter(id=>id!==groupId):[...withoutAll,groupId]
      return next.length?next:['all']
    })
  }

  const visibleGroupIds=selectedGroupIds.includes('all')
    ? activeGroups.map(group=>group.id)
    : selectedGroupIds

  const runGeneration=()=>{
    if(!isPrevalidationComplete(project)) return
    setRunning(true)
    setGenerationNotice('')
    window.setTimeout(()=>{
      const existing=uniqueGenerationRuns(project.generationRuns)
      const existingSignatures=new Set(existing.map(generationSignature))
      const target=existing.length===0?3:1
      const additions:GenerationRun[]=[]
      const maxSearch=existing.length===0?12:8
      const baseIndex=project.generationRuns.length

      for(let index=0;index<maxSearch&&additions.length<target;index++){
        const result=generateSchedule(project,60,baseIndex+index+1)
        const signature=generationSignature(result)
        if(existingSignatures.has(signature)) continue
        existingSignatures.add(signature)
        additions.push(result)
      }

      const merged=[...existing,...additions]
      saveProject({...project,generationRuns:merged,selectedGenerationRunId:additions[0]?.id??project.selectedGenerationRunId??merged[0]?.id??null})
      if(additions.length){
        setSelectedRunId(additions[0].id)
      }else if(existing[0]){
        setSelectedRunId(existing[0].id)
      }

      if(existing.length===0&&additions.length<3){
        setGenerationNotice(
          additions.length===1
            ? 'Tras buscar varias alternativas, Viyeutica solo ha encontrado una distribución distinta con la configuración actual.'
            : `Viyeutica ha encontrado ${additions.length} propuestas distintas de las 3 solicitadas. Las demás combinaciones obtenidas eran duplicadas.`
        )
      }else if(existing.length>0&&additions.length===0){
        setGenerationNotice('No se ha encontrado una propuesta nueva distinta de las ya existentes con la configuración actual.')
      }

      setRunning(false)
    },20)
  }

  const clearRuns=()=>{
    saveProject({...project,generationRuns:[],selectedGenerationRunId:null})
    setSelectedRunId('')
    setShowClearModal(false)
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
        <h2>{runs.length===0?'Generar 3 propuestas':'Añadir otra propuesta'}</h2>
        <p>{runs.length===0
          ? 'Viyeutica generará tres alternativas independientes para poder compararlas antes de decidir.'
          : 'Genera una nueva alternativa sin eliminar las propuestas existentes.'}</p>
      </div>
      <div className="generation-control-actions">
        {runs.length>0&&<button className="btn ghost-inline" onClick={()=>setShowClearModal(true)}>Limpiar propuestas</button>}
        <button className="btn primary" disabled={running} onClick={runGeneration}>
          {running
            ? <RefreshCcw className="spin" size={16}/>
            : runs.length===0?<Sparkles size={16}/>:<Plus size={16}/>}
          {running
            ? (runs.length===0?'Generando 3 propuestas...':'Generando propuesta...')
            : (runs.length===0?'Generar 3 propuestas':'Generar otra propuesta')}
        </button>
      </div>
    </section>

    {generationNotice&&<section className="generation-uniqueness-notice"><Info size={18}/><span>{generationNotice}</span></section>}

    {runs.length===0
      ? <section className="generation-empty">
          <CalendarDays size={38}/>
          <h2>Todavía no hay propuestas</h2>
          <p>Genera tres alternativas iniciales para compararlas y elegir la que mejor encaje con el centro.</p>
        </section>
      : <>
        <section className="generation-history">
          <div className="groups-table-heading">
            <div><span className="panel-kicker">Comparación</span><h2>Propuestas generadas</h2></div>
            <div className="generation-history-actions">
              <button className="btn ghost-inline" title="Invertir orden" onClick={()=>setAscending(value=>!value)}>
                <ArrowDownUp size={15}/> {ascending?'1 → N':'N → 1'}
              </button>
              <button className="btn ghost-inline generation-add-more" disabled={running} onClick={runGeneration}>
                {running?<RefreshCcw className="spin" size={15}/>:<Plus size={15}/>} {running?'Generando...':'Generar otra propuesta'}
              </button>
            </div>
          </div>
          <div className="generation-run-list">
            {(ascending?[...runs]:[...runs].reverse()).map((run,index)=>{
              const originalIndex=runs.findIndex(item=>item.id===run.id)
              const first=runs[0]
              const diff=first&&run.id!==first.id?generationDifference(first,run):null
              return <RunCard
                key={run.id}
                run={run}
                best={isBestRun(run,runs)}
                selected={run.id===selectedRun?.id}
                label={`Propuesta ${originalIndex+1}`}
                difference={diff?.differentPlacements??0}
                baseline={run.id===first?.id}
                onClick={()=>{
                  setSelectedRunId(run.id)
                  saveProject({...project,selectedGenerationRunId:run.id})
                }}
              />
            })}
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

          {(selectedRun.issues?.length??selectedRun.notes.length)>0&&<div className="generation-issues-summary">
            <div>
              <AlertTriangle size={18}/>
              <span>
                <strong>Hay incidencias que impiden completar el horario</strong>
                <small>{generationIssueSummary(selectedRun,project)}</small>
              </span>
            </div>
            <button className="btn secondary-light" onClick={()=>setShowIssuesModal(true)}>Ver incidencias</button>
          </div>}

          <div className="generation-toolbar generation-toolbar-tags">
            <div>
              <span className="panel-kicker">Ver horarios de</span>
              <div className="generation-group-tags">
                <button
                  type="button"
                  className={selectedGroupIds.includes('all')?'active':''}
                  onClick={()=>toggleGroup('all')}
                >Todos</button>
                {activeGroups.map(group=><button
                  key={group.id}
                  type="button"
                  className={!selectedGroupIds.includes('all')&&selectedGroupIds.includes(group.id)?'active':''}
                  onClick={()=>toggleGroup(group.id)}
                >{group.name}</button>)}
              </div>
            </div>
            <button className="btn ghost-inline" onClick={()=>navigate('/horarios')}>Abrir módulo Horarios</button>
          </div>

          {baselineRun&&selectedRun.id!==baselineRun.id&&<div className="generation-diff-legend">
            <span className="diff-swatch"/>
            <span>Marcado = colocación distinta respecto a Propuesta 1</span>
          </div>}

          <SchedulePreview
            project={project}
            run={selectedRun}
            baselineRun={baselineRun}
            groupIds={visibleGroupIds}
          />
        </section>}
      </>}

    {showClearModal&&<AppModal
      title="Eliminar propuestas generadas"
      icon={<Trash2 size={22}/>}
      onClose={()=>setShowClearModal(false)}
      footer={<>
        <button className="btn secondary-light" onClick={()=>setShowClearModal(false)}>Cancelar</button>
        <button className="btn danger-modal" onClick={clearRuns}>Eliminar propuestas</button>
      </>}
    >
      <p>Se eliminará el historial de propuestas generadas, pero <strong>no se modificarán</strong> el centro, profesorado, asignaciones, reglas ni normativa.</p>
    </AppModal>}

    {showIssuesModal&&selectedRun&&<GenerationIssuesModal
      project={project}
      run={selectedRun}
      onClose={()=>setShowIssuesModal(false)}
      navigate={navigate}
    />}
  </div>
}

function RunCard({
  run,best,selected,label,difference,baseline,onClick,
}:{
  run:GenerationRun
  best:boolean
  selected:boolean
  label:string
  difference:number
  baseline:boolean
  onClick:()=>void
}) {
  const Icon=run.status==='complete'?CheckCircle2:run.status==='partial'?AlertTriangle:XCircle
  return <button className={'generation-run-card '+(selected?'selected ':'')+run.status} onClick={onClick}>
    <Icon size={18}/>
    <span className="generation-run-main">
      <strong>{label}{best&&<em>Mejor</em>}</strong>
      <small>{run.placedSessions}/{run.requestedSessions} sesiones · HARD {run.hardViolations} · SOFT {run.softPenalty}</small>
      <small className="generation-difference">{baseline?'Referencia para comparar':difference===0?'Sin diferencias frente a Propuesta 1':`${difference} colocaciones distintas frente a Propuesta 1`}</small>
    </span>
    <span className="generation-run-score">{run.score}</span>
  </button>
}

function SchedulePreview({
  project,run,baselineRun,groupIds,
}:{
  project:ViyeuticaProject
  run:GenerationRun
  baselineRun:GenerationRun|null
  groupIds:string[]
}) {
  const teachingBlocks=project.schedule.blocks.filter(block=>block.active&&block.type==='teaching')
  return <div className="generation-multi-schedule">
    {groupIds.map(groupId=>{
      const group=project.groups.find(item=>item.id===groupId)
      const entries=run.entries.filter(entry=>entry.groupId===groupId)
      return <section className="generation-group-schedule" key={groupId}>
        <div className="generation-group-heading">
          <strong>{group?.name??'Grupo'}</strong>
          {baselineRun&&run.id!==baselineRun.id&&<small>{groupDifferenceCount(run,baselineRun,groupId)} cambios respecto a Propuesta 1</small>}
        </div>
        <div className="generated-schedule-wrap">
          <table className="generated-schedule">
            <thead><tr><th>Sesión</th>{project.schedule.activeDays.map(day=><th key={day}>{dayLabels[day]}</th>)}</tr></thead>
            <tbody>{teachingBlocks.map(block=><tr key={block.id}>
              <th><strong>{block.label}</strong><small>{block.start}–{block.end}</small></th>
              {project.schedule.activeDays.map(day=>{
                const cell=entries.filter(entry=>entry.day===day&&entry.sessionId===block.id)
                const primary=cell[0]
                const changed=baselineRun&&run.id!==baselineRun.id
                  ? cellDiffersFromBaseline(run,baselineRun,groupId,day,block.id)
                  : false
                if(!primary)return <td key={day} className={'empty-slot '+(changed?'proposal-diff-cell':'')}>—</td>
                const subject=project.subjects.find(item=>item.id===primary.subjectId)
                const teachers=cell.map(entry=>project.teachers.find(item=>item.id===entry.teacherId)?.name).filter(Boolean)
                return <td key={day} className={changed?'proposal-diff-cell':''}>
                  <strong>{subject?.name??'Materia'}</strong>
                  <small>{teachers.join(' + ')}</small>
                  {changed&&<em className="proposal-diff-badge">Distinta</em>}
                </td>
              })}
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    })}
  </div>
}

function cellSignature(run:GenerationRun,groupId:string,day:Weekday,sessionId:string){
  return run.entries
    .filter(entry=>entry.groupId===groupId&&entry.day===day&&entry.sessionId===sessionId)
    .map(entry=>[entry.assignmentId,entry.subjectId,entry.teacherId].join('|'))
    .sort()
    .join('||')
}

function cellDiffersFromBaseline(run:GenerationRun,baseline:GenerationRun,groupId:string,day:Weekday,sessionId:string){
  return cellSignature(run,groupId,day,sessionId)!==cellSignature(baseline,groupId,day,sessionId)
}

function groupDifferenceCount(run:GenerationRun,baseline:GenerationRun,groupId:string){
  const slots=new Set<string>()
  for(const entry of [...run.entries,...baseline.entries]){
    if(entry.groupId===groupId)slots.add(entry.day+'|'+entry.sessionId)
  }
  let changes=0
  for(const slot of slots){
    const [day,sessionId]=slot.split('|')
    if(cellDiffersFromBaseline(run,baseline,groupId,day as Weekday,sessionId))changes++
  }
  return changes
}

function isBestRun(run:GenerationRun,runs:GenerationRun[]){
  const best=[...runs].sort((a,b)=>a.hardViolations-b.hardViolations||b.score-a.score)[0]
  return best?.id===run.id
}
function Summary({label,value,detail}:{label:string;value:string;detail:string}){return <article className="structure-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>}


function generationIssueSummary(run:GenerationRun,project:ViyeuticaProject){
  const issues=humanGenerationIssues(run,project)
  if(!issues.length) return 'La propuesta contiene incidencias técnicas que deben revisarse.'
  const groups=new Set(issues.map(issue=>issue.group))
  const teachers=new Set(issues.map(issue=>issue.teacher))
  return `${issues.length} incidencias · ${groups.size} grupos afectados · ${teachers.size} docentes implicados`
}

function humanGenerationIssues(run:GenerationRun,project:ViyeuticaProject){
  if(run.issues?.length){
    return run.issues.map(issue=>{
      const group=project.groups.find(item=>item.id===issue.groupId)?.name??'Grupo no identificado'
      const subject=project.subjects.find(item=>item.id===issue.subjectId)?.name??'Materia no identificada'
      const teacher=project.teachers.find(item=>item.id===issue.teacherId)?.name??'Docente no identificado'
      const assignment=project.assignments.find(item=>item.id===issue.assignmentId)
      const type=assignment?.assignmentType==='support'?'apoyo':assignment?.assignmentType==='co_teaching'?'codocencia':'docencia'
      const reason=explainGenerationCause(project,issue.teacherId,issue.groupId,issue.subjectId)
      return {
        id:issue.id,
        group,
        subject,
        teacher,
        missing:issue.missingSessions,
        severity:issue.severity,
        title:issue.type==='unplaced_support'
          ? `No se han podido colocar ${issue.missingSessions} sesiones de ${type}`
          : `No se ha podido colocar ${issue.missingSessions===1?'una sesión':issue.missingSessions+' sesiones'}`,
        reason,
      }
    })
  }
  return run.notes.map((note,index)=>({
    id:'legacy_'+index,
    group:'No identificado',
    subject:'No identificada',
    teacher:'No identificado',
    missing:1,
    severity:'error' as const,
    title:'Incidencia de una propuesta anterior',
    reason:'Esta propuesta fue generada con una versión anterior de Viyeutica. Vuelve a generar para obtener un diagnóstico detallado.',
  }))
}

function explainGenerationCause(project:ViyeuticaProject,teacherId:string,groupId:string,subjectId:string){
  const teacher=project.teachers.find(item=>item.id===teacherId)
  const blocked=project.teacherAvailability.filter(item=>item.teacherId===teacherId&&(item.status==='unavailable'||item.status==='travel')).length
  const fixed=project.assignments.find(item=>item.active&&item.teacherId===teacherId&&item.groupId===groupId&&item.subjectId===subjectId)?.fixedSlots?.length??0
  const activeHard=project.rules.filter(rule=>rule.active&&rule.ruleType==='HARD').length
  const clues:string[]=[]
  if(blocked) clues.push(`${teacher?.name??'El docente'} tiene ${blocked} franjas no disponibles o de desplazamiento`)
  if(fixed) clues.push(`la asignación tiene ${fixed} franjas fijadas`)
  if(activeHard) clues.push(`hay ${activeHard} reglas obligatorias activas que restringen la colocación`)
  if(!clues.length) clues.push('no queda una combinación libre de grupo, docente y sesión que cumpla las restricciones actuales')
  return clues.join('; ')+'.'
}

function GenerationIssuesModal({
  project,run,onClose,navigate,
}:{
  project:ViyeuticaProject
  run:GenerationRun
  onClose:()=>void
  navigate:(path:string)=>void
}){
  const issues=humanGenerationIssues(run,project)
  return <AppModal
    title="Incidencias de generación"
    icon={<AlertTriangle size={22}/>}
    onClose={onClose}
    wide
    footer={<>
      <button className="btn secondary-light" onClick={onClose}>Cerrar</button>
      <button className="btn primary" onClick={()=>{onClose();navigate('/prevalidacion')}}>Revisar prevalidación</button>
    </>}
  >
    <div className="generation-issues-intro">
      <Info size={18}/>
      <p>Viyeutica no muestra códigos internos. Cada incidencia indica <strong>qué carga no ha podido colocarse</strong>, a quién afecta y una causa probable para orientar la corrección.</p>
    </div>
    <div className="generation-issues-list">
      {issues.map((issue,index)=><article key={issue.id}>
        <div className={'generation-issue-number '+issue.severity}>{index+1}</div>
        <div className="generation-issue-body">
          <strong>{issue.title}</strong>
          <div className="generation-issue-tags">
            <span>{issue.group}</span><span>{issue.subject}</span><span>{issue.teacher}</span>
          </div>
          <p><b>Por qué puede ocurrir:</b> {issue.reason}</p>
          <p><b>Qué revisar:</b> disponibilidad del docente, franjas fijas, número de sesiones exigidas y reglas HARD que afecten a este grupo o materia.</p>
        </div>
      </article>)}
    </div>
  </AppModal>
}
