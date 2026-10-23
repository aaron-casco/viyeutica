import type {
  CenterRule,
  GeneratedScheduleEntry,
  GenerationRun,
  TeachingAssignment,
  TimeBlock,
  ViyeuticaProject,
  Weekday,
} from './project'

type Slot={day:Weekday;sessionId:string;order:number;duration:number}
type Occupancy={
  group:Set<string>
  teacher:Set<string>
}

function uid(prefix:string){return prefix+'_'+crypto.randomUUID()}

function hashSeed(value:string){
  let h=2166136261
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0
}
function rng(seed:number){
  let state=seed||1
  return ()=>{
    state=(Math.imul(state,1664525)+1013904223)>>>0
    return state/4294967296
  }
}
function shuffle<T>(items:T[],random:()=>number){
  const out=[...items]
  for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out
}

function minutes(block:TimeBlock){
  const [sh,sm]=block.start.split(':').map(Number)
  const [eh,em]=block.end.split(':').map(Number)
  return (eh*60+em)-(sh*60+sm)
}

function sessionsRequired(project:ViyeuticaProject,assignment:TeachingAssignment,blocks:TimeBlock[]){
  if((assignment.weeklySessions??0)>0) return Math.max(1,Math.round(assignment.weeklySessions!))
  const entry=project.studyPlan.find(item=>item.active&&item.groupId===assignment.groupId&&item.subjectId===assignment.subjectId)
  if(entry?.weeklySessions&&entry.weeklySessions>0) return Math.max(1,Math.round(entry.weeklySessions))
  const target=(assignment.weeklyMinutes??0)>0?assignment.weeklyMinutes!:(entry?.weeklyMinutes??0)
  if(target<=0) return 1
  const durations=blocks.map(minutes).filter(v=>v>0).sort((a,b)=>a-b)
  const median=durations[Math.floor(durations.length/2)]||45
  return Math.max(1,Math.ceil(target/median))
}

function ruleMatches(rule:CenterRule,assignment:TeachingAssignment){
  const p=rule.parameters??{}
  if(p.teacherId&&p.teacherId!==assignment.teacherId) return false
  if(p.groupId&&p.groupId!==assignment.groupId) return false
  if(p.subjectId&&p.subjectId!==assignment.subjectId) return false
  return true
}

function slotMatches(rule:CenterRule,slot:Slot){
  const p=rule.parameters??{}
  if(p.day&&p.day!==slot.day) return false
  if(p.sessionId&&p.sessionId!==slot.sessionId) return false
  return true
}

function comparison(rule:CenterRule){
  return String(rule.parameters?.comparison??'equals')
}
function conditionKind(rule:CenterRule){
  return String(rule.parameters?.conditionKind??'generic')
}
function numericValue(rule:CenterRule){
  const value=Number(rule.parameters?.value)
  return Number.isFinite(value)?value:null
}

function unavailable(project:ViyeuticaProject,teacherId:string,slot:Slot){
  return project.teacherAvailability.some(item=>
    item.teacherId===teacherId &&
    item.day===slot.day &&
    item.session===slot.sessionId &&
    (item.status==='unavailable'||item.status==='travel')
  )
}

function countOnDay(entries:GeneratedScheduleEntry[],assignment:TeachingAssignment,day:Weekday,scope:string){
  if(scope==='teacher') return entries.filter(e=>e.day===day&&e.teacherId===assignment.teacherId).length
  if(scope==='group') return entries.filter(e=>e.day===day&&e.groupId===assignment.groupId).length
  if(scope==='subject') return entries.filter(e=>e.day===day&&e.subjectId===assignment.subjectId&&e.groupId===assignment.groupId).length
  return entries.filter(e=>e.day===day).length
}

function violatesDailyLimit(rule:CenterRule,assignment:TeachingAssignment,slot:Slot,entries:GeneratedScheduleEntry[]){
  if(conditionKind(rule)!=='daily_limit'||!ruleMatches(rule,assignment)) return false
  const value=numericValue(rule)
  if(value===null) return false
  const count=countOnDay(entries,assignment,slot.day,rule.scope)
  const cmp=comparison(rule)
  return cmp==='maximum' && count>=value
}

function violatesAvoid(rule:CenterRule,assignment:TeachingAssignment,slot:Slot){
  if(!ruleMatches(rule,assignment)||!slotMatches(rule,slot)) return false
  const kind=conditionKind(rule)
  const cmp=comparison(rule)
  return kind==='avoid_slot'||cmp==='avoid'||(kind==='availability'&&cmp==='not_equals')
}

function hardAllows(project:ViyeuticaProject,assignment:TeachingAssignment,slot:Slot,entries:GeneratedScheduleEntry[],occupancy:Occupancy){
  const key=slot.day+'|'+slot.sessionId
  if(occupancy.group.has(assignment.groupId+'|'+key)) return false
  if(occupancy.teacher.has(assignment.teacherId+'|'+key)) return false
  if(unavailable(project,assignment.teacherId,slot)) return false

  for(const rule of project.rules.filter(r=>r.active&&r.ruleType==='HARD')){
    if(violatesAvoid(rule,assignment,slot)) return false
    if(violatesDailyLimit(rule,assignment,slot,entries)) return false
  }
  return true
}

function softCost(project:ViyeuticaProject,assignment:TeachingAssignment,slot:Slot,entries:GeneratedScheduleEntry[]){
  let cost=0
  for(const rule of project.rules.filter(r=>r.active&&r.ruleType==='SOFT')){
    if(!ruleMatches(rule,assignment)) continue
    const weight=rule.weight??1
    const kind=conditionKind(rule)
    const cmp=comparison(rule)
    const matches=slotMatches(rule,slot)
    if((kind==='avoid_slot'||cmp==='avoid')&&matches) cost+=weight*10
    if(cmp==='prefer'&&!matches&&(rule.parameters?.day||rule.parameters?.sessionId)) cost+=weight*2
    if(kind==='daily_limit'&&numericValue(rule)!==null){
      const count=countOnDay(entries,assignment,slot.day,rule.scope)
      const value=numericValue(rule)!
      if(cmp==='maximum'&&count>=value) cost+=weight*(count-value+1)*4
      if(cmp==='minimum'&&count<value) cost+=weight
    }
  }
  return cost
}

function fixedSlotsFor(project:ViyeuticaProject,assignment:TeachingAssignment){
  const explicit=assignment.fixedSlots??[]
  const fromRules=project.rules
    .filter(rule=>rule.active&&rule.ruleType==='HARD'&&conditionKind(rule)==='fixed_slot'&&ruleMatches(rule,assignment))
    .map(rule=>({day:String(rule.parameters?.day??''),session:String(rule.parameters?.sessionId??'')}))
    .filter(item=>item.day&&item.session)
  return [...explicit,...fromRules] as {day:string;session:string}[]
}

function addEntry(entries:GeneratedScheduleEntry[],occupancy:Occupancy,assignment:TeachingAssignment,slot:Slot){
  const entry:GeneratedScheduleEntry={
    id:uid('slot'),
    assignmentId:assignment.id,
    groupId:assignment.groupId,
    subjectId:assignment.subjectId,
    teacherId:assignment.teacherId,
    day:slot.day,
    sessionId:slot.sessionId,
  }
  entries.push(entry)
  const key=slot.day+'|'+slot.sessionId
  occupancy.group.add(assignment.groupId+'|'+key)
  occupancy.teacher.add(assignment.teacherId+'|'+key)
}

function teacherGapPenalty(entries:GeneratedScheduleEntry[],slots:Slot[]){
  let gaps=0
  const byTeacherDay=new Map<string,number[]>()
  const orderBySlot=new Map(slots.map(slot=>[slot.day+'|'+slot.sessionId,slot.order]))
  for(const entry of entries){
    const key=entry.teacherId+'|'+entry.day
    const arr=byTeacherDay.get(key)??[]
    const order=orderBySlot.get(entry.day+'|'+entry.sessionId)
    if(order!==undefined) arr.push(order)
    byTeacherDay.set(key,arr)
  }
  for(const orders of byTeacherDay.values()){
    if(orders.length<2) continue
    const sorted=[...orders].sort((a,b)=>a-b)
    for(let i=1;i<sorted.length;i++) gaps+=Math.max(0,sorted[i]-sorted[i-1]-1)
  }
  return gaps
}

function evaluateSoft(project:ViyeuticaProject,entries:GeneratedScheduleEntry[],slots:Slot[]){
  let penalty=0
  const reduceGaps=project.rules.filter(r=>r.active&&r.ruleType==='SOFT'&&r.code==='REDUCIR_HUECOS_DOCENTES')
  for(const rule of reduceGaps) penalty+=teacherGapPenalty(entries,slots)*(rule.weight??1)

  for(const rule of project.rules.filter(r=>r.active&&r.ruleType==='SOFT'&&r.code!=='REDUCIR_HUECOS_DOCENTES')){
    const weight=rule.weight??1
    for(const entry of entries){
      const assignment=project.assignments.find(a=>a.id===entry.assignmentId)
      const slot=slots.find(s=>s.day===entry.day&&s.sessionId===entry.sessionId)
      if(!assignment||!slot||!ruleMatches(rule,assignment)) continue
      const kind=conditionKind(rule),cmp=comparison(rule)
      if((kind==='avoid_slot'||cmp==='avoid')&&slotMatches(rule,slot)) penalty+=weight*10
      if(cmp==='prefer'&&(rule.parameters?.day||rule.parameters?.sessionId)&&!slotMatches(rule,slot)) penalty+=weight*2
    }
  }
  return penalty
}

function generateAttempt(project:ViyeuticaProject,attempt:number){
  const teachingBlocks=project.schedule.blocks.filter(b=>b.active&&b.type==='teaching')
  const slots:Slot[]=[]
  for(const day of project.schedule.activeDays){
    teachingBlocks.forEach((block,index)=>slots.push({day,sessionId:block.id,order:index,duration:minutes(block)}))
  }

  const random=rng(hashSeed(project.academicYear.id+'|'+attempt))
  const entries:GeneratedScheduleEntry[]=[]
  const occupancy:Occupancy={group:new Set(),teacher:new Set()}
  const notes:string[]=[]
  let requested=0
  let hardViolations=0

  const assignments=project.assignments.filter(a=>a.active)
  const main=assignments.filter(a=>a.assignmentType==='main')
  const support=assignments.filter(a=>a.assignmentType!=='main')

  const orderedMain=shuffle(main,random).sort((a,b)=>{
    const af=fixedSlotsFor(project,a).length
    const bf=fixedSlotsFor(project,b).length
    const au=project.teacherAvailability.filter(x=>x.teacherId===a.teacherId&&(x.status==='unavailable'||x.status==='travel')).length
    const bu=project.teacherAvailability.filter(x=>x.teacherId===b.teacherId&&(x.status==='unavailable'||x.status==='travel')).length
    return (bf+bu)-(af+au)
  })

  for(const assignment of orderedMain){
    const needed=sessionsRequired(project,assignment,teachingBlocks)
    requested+=needed
    const fixed=fixedSlotsFor(project,assignment)

    for(let index=0;index<needed;index++){
      let candidates=shuffle(slots,random)

      if(index<fixed.length){
        const target=fixed[index]
        candidates=candidates.filter(slot=>slot.day===target.day&&slot.sessionId===target.session)
      }

      candidates=candidates
        .filter(slot=>hardAllows(project,assignment,slot,entries,occupancy))
        .sort((a,b)=>softCost(project,assignment,a,entries)-softCost(project,assignment,b,entries))

      const slot=candidates[0]
      if(!slot){
        hardViolations++
        notes.push(`No se pudo colocar ${assignment.id} (${assignment.groupId} / ${assignment.subjectId}).`)
        continue
      }
      addEntry(entries,occupancy,assignment,slot)
    }
  }

  // Apoyos y codocencias: intentan compartir sesiones ya colocadas del mismo grupo/materia.
  for(const assignment of shuffle(support,random)){
    const needed=sessionsRequired(project,assignment,teachingBlocks)
    requested+=needed
    const baseSlots=entries
      .filter(entry=>entry.groupId===assignment.groupId&&entry.subjectId===assignment.subjectId)
      .map(entry=>slots.find(slot=>slot.day===entry.day&&slot.sessionId===entry.sessionId))
      .filter(Boolean) as Slot[]
    let placed=0
    for(const slot of shuffle(baseSlots,random)){
      if(placed>=needed) break
      const teacherKey=assignment.teacherId+'|'+slot.day+'|'+slot.sessionId
      if(occupancy.teacher.has(teacherKey)||unavailable(project,assignment.teacherId,slot)) continue
      // Para apoyo/codocencia permitimos compartir grupo, pero no docente.
      const entry:GeneratedScheduleEntry={
        id:uid('slot'),assignmentId:assignment.id,groupId:assignment.groupId,
        subjectId:assignment.subjectId,teacherId:assignment.teacherId,day:slot.day,sessionId:slot.sessionId,
      }
      entries.push(entry)
      occupancy.teacher.add(teacherKey)
      placed++
    }
    if(placed<needed){
      hardViolations+=needed-placed
      notes.push(`Faltan ${needed-placed} sesiones de apoyo/codocencia para ${assignment.id}.`)
    }
  }

  const softPenalty=evaluateSoft(project,entries,slots)
  const status=hardViolations===0&&entries.length>=requested?'complete':entries.length?'partial':'failed'
  const score=Math.max(0,10000-hardViolations*1000-softPenalty)
  return {entries,requested,hardViolations,softPenalty,status,score,notes}
}

export function generateSchedule(project:ViyeuticaProject,attempts=40):GenerationRun{
  let best:ReturnType<typeof generateAttempt>|null=null
  for(let attempt=0;attempt<Math.max(1,attempts);attempt++){
    const result=generateAttempt(project,attempt)
    if(!best||result.hardViolations<best.hardViolations||(result.hardViolations===best.hardViolations&&result.score>best.score)){
      best=result
    }
    if(result.hardViolations===0&&result.softPenalty===0){best=result;break}
  }
  const final=best!
  return {
    id:uid('gen'),
    createdAt:new Date().toISOString(),
    status:final.status,
    score:final.score,
    hardViolations:final.hardViolations,
    softPenalty:final.softPenalty,
    placedSessions:final.entries.length,
    requestedSessions:final.requested,
    entries:final.entries,
    notes:final.notes,
  }
}
