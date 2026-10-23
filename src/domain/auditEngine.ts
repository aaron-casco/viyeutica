import type {
  AuditIssue,
  AuditResult,
  GenerationRun,
  TeachingAssignment,
  ViyeuticaProject,
} from './project'

function uid(prefix:string){return prefix+'_'+crypto.randomUUID()}

function sessionsRequired(project:ViyeuticaProject,assignment:TeachingAssignment){
  if((assignment.weeklySessions??0)>0) return Math.max(1,Math.round(assignment.weeklySessions!))
  const entry=project.studyPlan.find(item=>item.active&&item.groupId===assignment.groupId&&item.subjectId===assignment.subjectId)
  if(entry?.weeklySessions&&entry.weeklySessions>0) return Math.max(1,Math.round(entry.weeklySessions))
  if((assignment.weeklyMinutes??0)>0) return Math.max(1,Math.ceil((assignment.weeklyMinutes??0)/45))
  if((entry?.weeklyMinutes??0)>0) return Math.max(1,Math.ceil((entry?.weeklyMinutes??0)/45))
  return 1
}

export function auditGeneration(project:ViyeuticaProject,run:GenerationRun):AuditResult{
  const issues:AuditIssue[]=[]
  const push=(issue:Omit<AuditIssue,'id'>)=>issues.push({id:uid('audit'),...issue})

  // Integridad de referencias.
  for(const entry of run.entries){
    if(!project.groups.some(group=>group.id===entry.groupId&&group.active)){
      push({severity:'error',category:'Integridad',code:'GRUPO_NO_VALIDO',message:'Hay una sesión vinculada a un grupo inexistente o inactivo.',groupId:entry.groupId})
    }
    if(!project.subjects.some(subject=>subject.id===entry.subjectId&&subject.active)){
      push({severity:'error',category:'Integridad',code:'MATERIA_NO_VALIDA',message:'Hay una sesión vinculada a una materia inexistente o inactiva.',subjectId:entry.subjectId})
    }
    if(!project.teachers.some(teacher=>teacher.id===entry.teacherId&&teacher.active)){
      push({severity:'error',category:'Integridad',code:'DOCENTE_NO_VALIDO',message:'Hay una sesión vinculada a un docente inexistente o inactivo.',teacherId:entry.teacherId})
    }
    if(!project.schedule.activeDays.includes(entry.day)||!project.schedule.blocks.some(block=>block.id===entry.sessionId&&block.active&&block.type==='teaching')){
      push({severity:'error',category:'Integridad',code:'FRANJA_NO_VALIDA',message:'Hay una sesión fuera de la jornada lectiva activa.',day:entry.day,sessionId:entry.sessionId})
    }
  }

  // Solapes independientes del solver.
  const groupSlots=new Map<string,typeof run.entries>()
  const teacherSlots=new Map<string,typeof run.entries>()
  for(const entry of run.entries){
    const gk=`${entry.groupId}|${entry.day}|${entry.sessionId}`
    const tk=`${entry.teacherId}|${entry.day}|${entry.sessionId}`
    groupSlots.set(gk,[...(groupSlots.get(gk)??[]),entry])
    teacherSlots.set(tk,[...(teacherSlots.get(tk)??[]),entry])
  }
  for(const entries of groupSlots.values()){
    const assignmentTypes=entries.map(entry=>project.assignments.find(a=>a.id===entry.assignmentId)?.assignmentType)
    const mainCount=assignmentTypes.filter(type=>type==='main').length
    if(mainCount>1){
      const first=entries[0]
      push({severity:'error',category:'Solapes',code:'SOLAPE_GRUPO',message:'Un grupo tiene más de una docencia principal en la misma franja.',groupId:first.groupId,day:first.day,sessionId:first.sessionId})
    }
  }
  for(const entries of teacherSlots.values()){
    if(entries.length>1){
      const first=entries[0]
      push({severity:'error',category:'Solapes',code:'SOLAPE_DOCENTE',message:'Un docente aparece en más de una actividad en la misma franja.',teacherId:first.teacherId,day:first.day,sessionId:first.sessionId})
    }
  }

  // Disponibilidad.
  for(const entry of run.entries){
    const blocked=project.teacherAvailability.find(item=>
      item.teacherId===entry.teacherId&&item.day===entry.day&&item.session===entry.sessionId&&(item.status==='unavailable'||item.status==='travel')
    )
    if(blocked){
      push({severity:'error',category:'Disponibilidad',code:'DOCENTE_NO_DISPONIBLE',message:'Se ha colocado una sesión cuando el docente figura como no disponible o en desplazamiento.',detail:blocked.detail||undefined,teacherId:entry.teacherId,groupId:entry.groupId,subjectId:entry.subjectId,day:entry.day,sessionId:entry.sessionId})
    }
  }

  // Franjas fijas.
  for(const assignment of project.assignments.filter(a=>a.active)){
    for(const fixed of assignment.fixedSlots??[]){
      const exists=run.entries.some(entry=>entry.assignmentId===assignment.id&&entry.day===fixed.day&&entry.sessionId===fixed.session)
      if(!exists){
        push({severity:'error',category:'Franjas fijas',code:'FRANJA_FIJA_INCUMPLIDA',message:'Una asignación no aparece en una franja fijada obligatoria.',teacherId:assignment.teacherId,groupId:assignment.groupId,subjectId:assignment.subjectId,day:fixed.day as any,sessionId:fixed.session})
      }
    }
  }

  // Cobertura y carga semanal por asignación.
  for(const assignment of project.assignments.filter(a=>a.active)){
    const expected=sessionsRequired(project,assignment)
    const actual=run.entries.filter(entry=>entry.assignmentId===assignment.id).length
    if(actual<expected){
      push({severity:'error',category:'Cobertura',code:'SESIONES_INCOMPLETAS',message:'Una asignación tiene menos sesiones de las requeridas.',detail:`Requeridas: ${expected} · Colocadas: ${actual}`,teacherId:assignment.teacherId,groupId:assignment.groupId,subjectId:assignment.subjectId})
    }else if(actual>expected){
      push({severity:'warning',category:'Carga semanal',code:'SESIONES_EXCESIVAS',message:'Una asignación tiene más sesiones de las configuradas.',detail:`Configuradas: ${expected} · Colocadas: ${actual}`,teacherId:assignment.teacherId,groupId:assignment.groupId,subjectId:assignment.subjectId})
    }
  }

  // Cobertura del plan de estudios.
  for(const plan of project.studyPlan.filter(item=>item.active)){
    const exists=run.entries.some(entry=>entry.groupId===plan.groupId&&entry.subjectId===plan.subjectId)
    if(!exists){
      push({severity:'error',category:'Cobertura',code:'PLAN_SIN_PRESENCIA',message:'Una materia del plan de estudios no aparece en el horario generado.',groupId:plan.groupId,subjectId:plan.subjectId})
    }
  }

  // Reglas HARD evaluables.
  for(const rule of project.rules.filter(rule=>rule.active&&rule.ruleType==='HARD')){
    const p=rule.parameters??{}
    if(rule.code==='SIN_SOLAPE_DOCENTE'||rule.code==='SIN_SOLAPE_GRUPO'||rule.code==='RESPETAR_DISPONIBILIDAD_DOCENTE'||rule.code==='RESPETAR_FRANJAS_FIJAS') continue
    const kind=String(p.conditionKind??'')
    if(kind==='avoid_slot'){
      const affected=run.entries.filter(entry=>{
        if(p.teacherId&&p.teacherId!==entry.teacherId)return false
        if(p.groupId&&p.groupId!==entry.groupId)return false
        if(p.subjectId&&p.subjectId!==entry.subjectId)return false
        if(p.day&&p.day!==entry.day)return false
        if(p.sessionId&&p.sessionId!==entry.sessionId)return false
        return true
      })
      if(affected.length){
        push({severity:'error',category:'Reglas',code:rule.code,message:`Se incumple la regla obligatoria: ${rule.description}`,detail:`${affected.length} sesiones afectadas`})
      }
    }else{
      push({severity:'warning',category:'Reglas',code:'REGLA_NO_AUDITABLE',message:`La regla HARD "${rule.description}" todavía no tiene una condición auditable automáticamente.`})
    }
  }

  const errors=issues.filter(issue=>issue.severity==='error').length
  const warnings=issues.filter(issue=>issue.severity==='warning').length
  const infos=issues.filter(issue=>issue.severity==='info').length
  return {
    runId:run.id,
    createdAt:new Date().toISOString(),
    passed:errors===0,
    errors,warnings,infos,issues,
  }
}
