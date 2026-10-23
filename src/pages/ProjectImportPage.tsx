import { useEffect, useRef, useState } from 'react'
import { ArrowUpToLine, CheckCircle2, Eye, FileJson, Save, ShieldAlert, Trash2, TriangleAlert } from 'lucide-react'
import { EMPTY_PROJECT, type ViyeuticaProject } from '../domain/project'
import { saveProject } from '../store/projectStorage'
import { AppModal } from '../components/AppModal'
import {
  deleteStoredProjectJson,
  loadStoredProjectJsons,
  storeProjectJson,
  type StoredProjectJson,
} from '../store/jsonFileStorage'

type ImportEnvelope = {
  format?: string
  formatVersion?: number
  project?: Partial<ViyeuticaProject>
  reviewRequired?: { path:string; reason:string }[]
  generatedFrom?: Record<string, unknown>
}

function normalizeProject(raw:Partial<ViyeuticaProject>):ViyeuticaProject {
  return {
    ...structuredClone(EMPTY_PROJECT),
    ...raw,
    center:{...structuredClone(EMPTY_PROJECT.center),...(raw.center??{})},
    academicYear:{...EMPTY_PROJECT.academicYear,...(raw.academicYear??{})},
    groups:Array.isArray(raw.groups)?raw.groups:[],
    schedule:{
      ...structuredClone(EMPTY_PROJECT.schedule),
      ...(raw.schedule??{}),
      activeDays:Array.isArray(raw.schedule?.activeDays)?raw.schedule!.activeDays:[...EMPTY_PROJECT.schedule.activeDays],
      blocks:Array.isArray(raw.schedule?.blocks)?raw.schedule!.blocks:[],
    },
    subjects:Array.isArray(raw.subjects)?raw.subjects:[],
    studyPlan:Array.isArray(raw.studyPlan)?raw.studyPlan:[],
    teachers:Array.isArray(raw.teachers)?raw.teachers:[],
    teacherAvailability:Array.isArray(raw.teacherAvailability)?raw.teacherAvailability:[],
    assignments:Array.isArray(raw.assignments)?raw.assignments:[],
    rules:Array.isArray(raw.rules)?raw.rules:[],
    generationRuns:Array.isArray(raw.generationRuns)?raw.generationRuns:[],
    selectedGenerationRunId:raw.selectedGenerationRunId??null,
    normativeSources:Array.isArray(raw.normativeSources)?raw.normativeSources:[],
    normativeRules:Array.isArray(raw.normativeRules)?raw.normativeRules:[],
    updatedAt:null,
  }
}

function nextAcademicYear(project:ViyeuticaProject):ViyeuticaProject {
  const start=project.academicYear.startYear+1
  const end=project.academicYear.endYear+1
  return {
    ...project,
    academicYear:{id:`${start}-${end}`,label:`${start}/${end}`,startYear:start,endYear:end},
    updatedAt:null,
  }
}

export function ProjectImportPage({project,navigate}:{project:ViyeuticaProject;navigate:(path:string)=>void}) {
  const inputRef=useRef<HTMLInputElement|null>(null)
  const [candidate,setCandidate]=useState<ViyeuticaProject|null>(null)
  const [review,setReview]=useState<{path:string;reason:string}[]>([])
  const [filename,setFilename]=useState('')
  const [error,setError]=useState('')
  const [done,setDone]=useState('')
  const [pendingMode,setPendingMode]=useState<'same'|'next'|null>(null)
  const [jsonPreview,setJsonPreview]=useState('')
  const [showJsonModal,setShowJsonModal]=useState(false)
  const [storedJsons,setStoredJsons]=useState<StoredProjectJson[]>([])
  const [storedPreview,setStoredPreview]=useState<StoredProjectJson|null>(null)

  useEffect(()=>setStoredJsons(loadStoredProjectJsons()),[])

  const readFile=async(file:File)=>{
    setError('');setDone('')
    try{
      const rawText=await file.text()
      const parsed=JSON.parse(rawText) as ImportEnvelope|Partial<ViyeuticaProject>
      const envelope=(parsed as ImportEnvelope).project ? parsed as ImportEnvelope : {project:parsed as Partial<ViyeuticaProject>}
      if(envelope.format && envelope.format!=='viyeutica-school-project') throw new Error('El JSON no tiene un formato Viyeutica reconocido.')
      const normalized=normalizeProject(envelope.project??{})
      await storeProjectJson(file,rawText)
      setStoredJsons(loadStoredProjectJsons())
      setCandidate(normalized)
      setReview(envelope.reviewRequired??[])
      setFilename(file.name)
      setJsonPreview(JSON.stringify(parsed,null,2))
    }catch(err){
      setCandidate(null)
      setJsonPreview('')
      setError(err instanceof Error?err.message:'No se ha podido leer el JSON.')
    }finally{
      if(inputRef.current) inputRef.current.value=''
    }
  }

  const removeCandidate=()=>{
    setCandidate(null)
    setReview([])
    setFilename('')
    setJsonPreview('')
    setPendingMode(null)
    setShowJsonModal(false)
    setError('')
    setDone('')
  }

  const removeStoredJson=(id:string)=>{
    deleteStoredProjectJson(id)
    setStoredJsons(loadStoredProjectJsons())
    if(storedPreview?.id===id)setStoredPreview(null)
  }

  const requestApply=(mode:'same'|'next')=>{
    if(!candidate)return
    setPendingMode(mode)
  }

  const confirmApply=()=>{
    if(!candidate||!pendingMode)return
    const next=pendingMode==='next'?nextAcademicYear(candidate):candidate
    saveProject(next)
    setDone(pendingMode==='next'?`Importado como curso ${next.academicYear.label}.`:`Curso ${next.academicYear.label} restaurado.`)
    setPendingMode(null)
    setTimeout(()=>navigate('/'),250)
  }

  const exportCurrent=()=>{
    const envelope={
      format:'viyeutica-school-project',
      formatVersion:1,
      exportedAt:new Date().toISOString(),
      project,
    }
    const blob=new Blob([JSON.stringify(envelope,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob)
    const anchor=document.createElement('a')
    const safe=(project.center.name||'centro').replace(/[^a-z0-9áéíóúñ_-]+/gi,'_')
    anchor.href=url
    anchor.download=`viyeutica_${safe}_${project.academicYear.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="project-import-page">
    <section className="wizard-intro">
      <div><span className="eyebrow dark"><FileJson size={15}/> Portabilidad del curso</span><h1>Importar / exportar JSON</h1><p>Guarda los pasos 1–7 de un centro en un único fichero y reutilízalo el curso siguiente como punto de partida editable.</p></div>
    </section>

    <section className="import-grid">
      <article className="normative-upload-card">
        <div className="normative-upload-icon"><ArrowUpToLine size={28}/></div>
        <div><span className="panel-kicker">Restaurar o reutilizar</span><h2>Subir JSON de centro</h2><p>Admite el formato <code>viyeutica-school-project</code>. Puede contener Centro, grupos, jornada, plan de estudios, profesorado, asignaciones y reglas.</p></div>
        <input ref={inputRef} hidden type="file" accept=".json,application/json" onChange={e=>e.target.files?.[0]&&readFile(e.target.files[0])}/>
        <button className="btn primary" onClick={()=>inputRef.current?.click()}><FileJson size={16}/> Seleccionar JSON</button>
      </article>

      <article className="export-project-card">
        <div><Save size={24}/><span><strong>Exportar curso actual</strong><small>Genera una copia portable del proyecto guardado en este navegador.</small></span></div>
        <button className="btn ghost-inline" onClick={exportCurrent}>Descargar JSON</button>
      </article>
    </section>

    {storedPreview&&<AppModal
      title={storedPreview.name}
      icon={<FileJson size={22}/>}
      onClose={()=>setStoredPreview(null)}
      wide
      footer={<button className="btn secondary-light" onClick={()=>setStoredPreview(null)}>Cerrar</button>}
    >
      <div className="json-document-viewer"><pre>{formatStoredJson(storedPreview.rawText)}</pre></div>
    </AppModal>}

    {storedJsons.length>0&&<section className="stored-json-section">
      <div className="groups-table-heading">
        <div><span className="panel-kicker">JSON cargados</span><h2>Archivos disponibles en este navegador</h2></div>
      </div>
      <div className="stored-json-list">
        {storedJsons.map(item=><article key={item.id} className="stored-json-item">
          <div className="stored-json-icon"><FileJson size={20}/></div>
          <div className="stored-json-copy">
            <strong>{item.name}</strong>
            <small>{formatBytes(item.size)} · cargado {new Date(item.addedAt).toLocaleString('es-ES')}</small>
          </div>
          <div className="stored-json-actions">
            <button title="Ver JSON" aria-label={'Ver '+item.name} onClick={()=>setStoredPreview(item)}><Eye size={16}/></button>
            <button className="row-delete" title="Eliminar JSON" aria-label={'Eliminar '+item.name} onClick={()=>removeStoredJson(item.id)}><Trash2 size={16}/></button>
          </div>
        </article>)}
      </div>
    </section>}

    {error&&<div className="inline-error">{error}</div>}
    {done&&<div className="template-result"><CheckCircle2 size={16}/><span>{done}</span></div>}

    {pendingMode&&candidate&&<AppModal
      title={pendingMode==='next'?'Usar este proyecto como base':'Restaurar proyecto'}
      icon={<TriangleAlert size={22}/>}
      onClose={()=>setPendingMode(null)}
      footer={<>
        <button className="btn secondary-light" onClick={()=>setPendingMode(null)}>Cancelar</button>
        <button className="btn primary" onClick={confirmApply}>{pendingMode==='next'?'Usar como base':'Restaurar proyecto'}</button>
      </>}
    >
      <p>Esta acción <strong>sustituirá los datos actuales guardados en este navegador</strong> por los del archivo <strong>{filename}</strong>.</p>
      <p style={{marginTop:8}}>No se modificará el archivo JSON original. Después podrás seguir editando el proyecto normalmente.</p>
    </AppModal>}

    {showJsonModal&&candidate&&<AppModal
      title={filename}
      icon={<FileJson size={22}/>}
      onClose={()=>setShowJsonModal(false)}
      wide
      footer={<button className="btn secondary-light" onClick={()=>setShowJsonModal(false)}>Cerrar</button>}
    >
      <div className="json-document-viewer">
        <pre>{jsonPreview}</pre>
      </div>
    </AppModal>}

    {candidate&&<section className="import-preview-card">
      <div className="groups-table-heading">
        <div><span className="panel-kicker">Vista previa</span><h2>{filename}</h2></div>
        <div className="import-preview-actions">
          <button className="btn ghost-inline" onClick={()=>setShowJsonModal(true)}><Eye size={15}/> Ver JSON</button>
          <button className="btn ghost-inline danger-text" onClick={removeCandidate}><Trash2 size={15}/> Quitar archivo</button>
        </div>
      </div>
      <div className="import-kpis">
        <Kpi label="Curso" value={candidate.academicYear.label}/>
        <Kpi label="Grupos" value={String(candidate.groups.length)}/>
        <Kpi label="Materias" value={String(candidate.subjects.length)}/>
        <Kpi label="Profesorado" value={String(candidate.teachers.length)}/>
        <Kpi label="Asignaciones" value={String(candidate.assignments.length)}/>
        <Kpi label="Reglas" value={String(candidate.rules.length)}/>
      </div>
      <div className="import-center-summary"><strong>{candidate.center.name||'Centro sin nombre en el JSON'}</strong><span>{candidate.center.centerType||'Tipo sin especificar'} · {candidate.center.stages.join(' + ')||'Etapas sin especificar'}</span></div>
      {review.length>0&&<div className="import-review"><ShieldAlert size={18}/><div><strong>{review.length} campos requieren revisión</strong>{review.slice(0,6).map(item=><p key={item.path}><code>{item.path}</code> — {item.reason}</p>)}{review.length>6&&<p>… y {review.length-6} más.</p>}</div></div>}
      <div className="import-actions">
        <button className="btn secondary-light" onClick={()=>requestApply('same')}>Restaurar {candidate.academicYear.label}</button>
        <button className="btn primary" onClick={()=>requestApply('next')}>Usar como base para {candidate.academicYear.startYear+1}/{candidate.academicYear.endYear+1}</button>
      </div>
    </section>}
  </div>
}

function Kpi({label,value}:{label:string;value:string}){return <article><span>{label}</span><strong>{value}</strong></article>}


function formatStoredJson(raw:string){
  try{return JSON.stringify(JSON.parse(raw),null,2)}catch{return raw}
}

function formatBytes(value:number){
  if(value<1024)return value+' B'
  if(value<1024*1024)return (value/1024).toFixed(1)+' KB'
  return (value/(1024*1024)).toFixed(1)+' MB'
}
