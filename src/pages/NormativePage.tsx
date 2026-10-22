import { useMemo, useRef, useState } from 'react'
import {
  CheckCircle2, FileSearch, FileText, ShieldCheck, Trash2, UploadCloud, XCircle,
} from 'lucide-react'
import type { NormativeRule, NormativeSection, ViyeuticaProject } from '../domain/project'
import { analyzeNormativeFile } from '../domain/normativeAnalyzer'
import { saveProject } from '../store/projectStorage'

const SECTION_LABELS:Record<NormativeSection,string>={
  center:'Centro',
  structure:'Estructura y grupos',
  schedule:'Jornada y sesiones',
  study_plan:'Plan de estudios',
  staff:'Profesorado',
  assignments:'Asignaciones',
  rules:'Reglas',
  general:'General',
}

export function NormativePage({project}:{project:ViyeuticaProject}) {
  const inputRef=useRef<HTMLInputElement|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [filter,setFilter]=useState<NormativeSection|'all'>('all')

  const approved=project.normativeRules.filter(rule=>rule.approved)
  const visibleRules=useMemo(
    ()=>project.normativeRules.filter(rule=>filter==='all'||rule.section===filter),
    [project.normativeRules,filter],
  )

  const persist=(patch:Partial<ViyeuticaProject>)=>saveProject({...project,...patch})

  const upload=async(file:File)=>{
    setBusy(true)
    setError('')
    try{
      const result=await analyzeNormativeFile(file)
      const duplicate=project.normativeSources.some(source=>source.sha256===result.source.sha256)
      if(duplicate){
        setError('Este documento ya está cargado en Normativa.')
        return
      }
      persist({
        normativeSources:[...project.normativeSources,result.source],
        normativeRules:[...project.normativeRules,...result.rules],
      })
    }catch(err){
      setError(err instanceof Error ? err.message : 'No se ha podido analizar el documento.')
    }finally{
      setBusy(false)
      if(inputRef.current) inputRef.current.value=''
    }
  }

  const toggleRule=(id:string)=>persist({
    normativeRules:project.normativeRules.map(rule=>rule.id===id?{...rule,approved:!rule.approved}:rule),
  })

  const approveHighConfidence=()=>persist({
    normativeRules:project.normativeRules.map(rule=>rule.confidence>=0.78?{...rule,approved:true}:rule),
  })

  const rejectAll=()=>persist({
    normativeRules:project.normativeRules.map(rule=>({...rule,approved:false})),
  })

  const removeSource=(sourceId:string)=>persist({
    normativeSources:project.normativeSources.filter(source=>source.id!==sourceId),
    normativeRules:project.normativeRules.filter(rule=>rule.sourceId!==sourceId),
  })

  return <div className="normative-page">
    <section className="wizard-intro">
      <div>
        <span className="eyebrow dark"><FileSearch size={15}/> Fuentes del proyecto</span>
        <h1>Normativa</h1>
        <p>Carga documentos normativos para que Viyeutica extraiga reglas candidatas. Ninguna regla se utiliza en plantillas hasta que sea revisada y aprobada.</p>
      </div>
      <div className="normative-kpis">
        <span><strong>{project.normativeSources.length}</strong><small>documentos</small></span>
        <span><strong>{project.normativeRules.length}</strong><small>reglas detectadas</small></span>
        <span><strong>{approved.length}</strong><small>aprobadas</small></span>
      </div>
    </section>

    <section className="normative-upload-card">
      <div className="normative-upload-icon"><UploadCloud size={30}/></div>
      <div>
        <span className="panel-kicker">Importar fuente</span>
        <h2>Subir normativa</h2>
        <p>Compatible actualmente con PDF con texto, TXT y Markdown. El análisis se realiza en el navegador; el archivo no se envía a un servidor de Viyeutica.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        hidden
        onChange={event=>event.target.files?.[0]&&upload(event.target.files[0])}
      />
      <button className="btn primary" disabled={busy} onClick={()=>inputRef.current?.click()}>
        <UploadCloud size={16}/>{busy?'Analizando...':'Seleccionar archivo'}
      </button>
    </section>

    {error&&<div className="inline-error normative-error">{error}</div>}

    {project.normativeSources.length>0&&<section className="normative-sources">
      {project.normativeSources.map(source=>{
        const sourceRules=project.normativeRules.filter(rule=>rule.sourceId===source.id)
        const sourceApproved=sourceRules.filter(rule=>rule.approved).length
        return <article className="normative-source-card" key={source.id}>
          <FileText size={22}/>
          <div className="normative-source-main">
            <strong>{source.name}</strong>
            <span>{source.pageCount} pág. · {formatBytes(source.size)} · {source.extractedChars.toLocaleString('es-ES')} caracteres</span>
            <small>{source.stages.length?source.stages.join(' · '):'Etapa no determinada'} · SHA-256 {source.sha256.slice(0,12)}…</small>
          </div>
          <div className="normative-source-count"><strong>{sourceApproved}/{sourceRules.length}</strong><small>reglas aprobadas</small></div>
          <button className="row-delete" title="Eliminar fuente" onClick={()=>removeSource(source.id)}><Trash2 size={16}/></button>
        </article>
      })}
    </section>}

    <section className="normative-rules-card">
      <div className="normative-rules-heading">
        <div>
          <span className="panel-kicker">Extracción estructurada</span>
          <h2>Reglas candidatas</h2>
          <p>Comprueba el fragmento original antes de aprobar. Las reglas aprobadas son las únicas disponibles para las plantillas.</p>
        </div>
        <div className="normative-rule-actions">
          <button className="btn ghost-inline" onClick={approveHighConfidence}><CheckCircle2 size={15}/> Aprobar alta confianza</button>
          <button className="btn ghost-inline" onClick={rejectAll}><XCircle size={15}/> Desmarcar todas</button>
        </div>
      </div>

      <div className="normative-filter-row">
        <button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Todas</button>
        {(Object.keys(SECTION_LABELS) as NormativeSection[]).map(section=>
          <button key={section} className={filter===section?'active':''} onClick={()=>setFilter(section)}>{SECTION_LABELS[section]}</button>
        )}
      </div>

      {visibleRules.length===0
        ? <div className="groups-empty"><ShieldCheck size={28}/><strong>No hay reglas en esta vista</strong><p>Sube un documento o cambia el filtro.</p></div>
        : <div className="normative-rule-list">
            {visibleRules.map(rule=><RuleCard
              key={rule.id}
              rule={rule}
              sourceName={project.normativeSources.find(source=>source.id===rule.sourceId)?.name??'Fuente eliminada'}
              onToggle={()=>toggleRule(rule.id)}
            />)}
          </div>}
    </section>

    <section className="notice amber normative-notice">
      <ShieldCheck size={18}/>
      <span><strong>Importante:</strong> la extracción es asistida y puede interpretar mal tablas, columnas o PDFs escaneados. La aprobación humana es obligatoria antes de reutilizar una regla.</span>
    </section>
  </div>
}

function RuleCard({rule,sourceName,onToggle}:{rule:NormativeRule;sourceName:string;onToggle:()=>void}) {
  return <article className={'normative-rule '+(rule.approved?'approved':'')}>
    <button className={'normative-approve '+(rule.approved?'approved':'')} onClick={onToggle}>
      {rule.approved?<CheckCircle2 size={18}/>:<span/>}
    </button>
    <div className="normative-rule-body">
      <div className="normative-rule-meta">
        <span>{SECTION_LABELS[rule.section]}</span>
        {rule.stage&&<span>{rule.stage}</span>}
        {rule.level&&<span>{rule.level}</span>}
        {rule.subject&&<span>{rule.subject}</span>}
        <span>Pág. {rule.page}</span>
      </div>
      <strong>{rule.label}</strong>
      <blockquote>{rule.excerpt}</blockquote>
      <div className="normative-rule-footer">
        <span>{sourceName}</span>
        <span>{rule.value!==null?`${rule.value} ${unitLabel(rule.unit)}`:'Regla textual'}</span>
        <span>Confianza {Math.round(rule.confidence*100)}%</span>
      </div>
    </div>
  </article>
}

function unitLabel(unit:NormativeRule['unit']){
  if(unit==='hours') return 'h'
  if(unit==='minutes') return 'min'
  if(unit==='periods') return 'periodos'
  return ''
}

function formatBytes(bytes:number){
  if(bytes<1024) return bytes+' B'
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB'
  return (bytes/(1024*1024)).toFixed(1)+' MB'
}
