import type {
  CenterRule,
  GeneratedScheduleEntry,
  TeachingAssignment,
  Weekday,
} from './project'

export interface RuleSlot {
  day: Weekday
  sessionId: string
  order?: number
}

export function ruleConditionKind(rule:CenterRule){
  return String(rule.parameters?.conditionKind??'generic')
}

export function ruleComparison(rule:CenterRule){
  return String(rule.parameters?.comparison??'equals')
}

export function ruleNumericValue(rule:CenterRule){
  const value=Number(rule.parameters?.value)
  return Number.isFinite(value)?value:null
}

export function ruleMatchesAssignment(rule:CenterRule,assignment:TeachingAssignment){
  const p=rule.parameters??{}
  if(p.teacherId&&p.teacherId!==assignment.teacherId) return false
  if(p.groupId&&p.groupId!==assignment.groupId) return false
  if(p.subjectId&&p.subjectId!==assignment.subjectId) return false
  return true
}

export function ruleMatchesEntry(rule:CenterRule,entry:GeneratedScheduleEntry){
  const p=rule.parameters??{}
  if(p.teacherId&&p.teacherId!==entry.teacherId) return false
  if(p.groupId&&p.groupId!==entry.groupId) return false
  if(p.subjectId&&p.subjectId!==entry.subjectId) return false
  if(p.day&&p.day!==entry.day) return false
  if(p.sessionId&&p.sessionId!==entry.sessionId) return false
  return true
}

export function ruleSlotMatches(rule:CenterRule,slot:RuleSlot){
  const p=rule.parameters??{}
  if(p.day&&p.day!==slot.day) return false
  if(p.sessionId&&p.sessionId!==slot.sessionId) return false
  return true
}

function entryMatchesScope(entry:GeneratedScheduleEntry,assignment:TeachingAssignment,scope:string){
  if(scope==='teacher') return entry.teacherId===assignment.teacherId
  if(scope==='group') return entry.groupId===assignment.groupId
  if(scope==='subject') return entry.subjectId===assignment.subjectId&&entry.groupId===assignment.groupId
  return true
}

export function countRuleScopeOnDay(
  entries:GeneratedScheduleEntry[],
  assignment:TeachingAssignment,
  day:Weekday,
  scope:string,
){
  return entries.filter(entry=>entry.day===day&&entryMatchesScope(entry,assignment,scope)).length
}

export function countRuleScopeWeekly(
  entries:GeneratedScheduleEntry[],
  assignment:TeachingAssignment,
  scope:string,
){
  return entries.filter(entry=>entryMatchesScope(entry,assignment,scope)).length
}

export function violatesAvoidRule(rule:CenterRule,assignment:TeachingAssignment,slot:RuleSlot){
  if(!ruleMatchesAssignment(rule,assignment)||!ruleSlotMatches(rule,slot)) return false
  const kind=ruleConditionKind(rule)
  const cmp=ruleComparison(rule)
  return kind==='avoid_slot'||cmp==='avoid'||(kind==='availability'&&cmp==='not_equals')
}

export function violatesDailyLimitRule(
  rule:CenterRule,
  assignment:TeachingAssignment,
  slot:RuleSlot,
  entries:GeneratedScheduleEntry[],
){
  if(ruleConditionKind(rule)!=='daily_limit'||!ruleMatchesAssignment(rule,assignment)) return false
  const value=ruleNumericValue(rule)
  if(value===null) return false
  const count=countRuleScopeOnDay(entries,assignment,slot.day,rule.scope)
  return ['maximum','equals'].includes(ruleComparison(rule))&&count>=value
}

export function violatesWeeklyLoadRule(
  rule:CenterRule,
  assignment:TeachingAssignment,
  entries:GeneratedScheduleEntry[],
){
  if(ruleConditionKind(rule)!=='weekly_load'||!ruleMatchesAssignment(rule,assignment)) return false
  const value=ruleNumericValue(rule)
  if(value===null) return false
  const count=countRuleScopeWeekly(entries,assignment,rule.scope)
  return ['maximum','equals'].includes(ruleComparison(rule))&&count>=value
}

export function consecutiveRunLength(
  entries:GeneratedScheduleEntry[],
  assignment:TeachingAssignment,
  slot:RuleSlot,
  scope:string,
  orderBySession:Map<string,number>,
){
  const currentOrder=slot.order??orderBySession.get(slot.sessionId)
  if(currentOrder===undefined) return 1
  const occupied=new Set<number>([currentOrder])
  for(const entry of entries){
    if(entry.day!==slot.day||!entryMatchesScope(entry,assignment,scope)) continue
    const order=orderBySession.get(entry.sessionId)
    if(order!==undefined) occupied.add(order)
  }
  let length=1
  for(let order=currentOrder-1;occupied.has(order);order--) length++
  for(let order=currentOrder+1;occupied.has(order);order++) length++
  return length
}

export function violatesConsecutiveLimitRule(
  rule:CenterRule,
  assignment:TeachingAssignment,
  slot:RuleSlot,
  entries:GeneratedScheduleEntry[],
  orderBySession:Map<string,number>,
){
  if(ruleConditionKind(rule)!=='consecutive_limit'||!ruleMatchesAssignment(rule,assignment)) return false
  const value=ruleNumericValue(rule)
  if(value===null) return false
  const run=consecutiveRunLength(entries,assignment,slot,rule.scope,orderBySession)
  return ['maximum','equals'].includes(ruleComparison(rule))&&run>value
}

export function fixedSlotFromRule(rule:CenterRule,assignment:TeachingAssignment){
  if(ruleConditionKind(rule)!=='fixed_slot'||!ruleMatchesAssignment(rule,assignment)) return null
  const day=String(rule.parameters?.day??'')
  const session=String(rule.parameters?.sessionId??'')
  return day&&session?{day,session}:null
}

export function softRulePlacementCost(
  rule:CenterRule,
  assignment:TeachingAssignment,
  slot:RuleSlot,
  entries:GeneratedScheduleEntry[],
  orderBySession?:Map<string,number>,
){
  if(!ruleMatchesAssignment(rule,assignment)) return 0
  const weight=rule.weight??1
  const kind=ruleConditionKind(rule)
  const cmp=ruleComparison(rule)
  const matches=ruleSlotMatches(rule,slot)
  let cost=0
  if((kind==='avoid_slot'||cmp==='avoid')&&matches) cost+=weight*10
  if(cmp==='prefer'&&!matches&&(rule.parameters?.day||rule.parameters?.sessionId)) cost+=weight*2
  if(kind==='daily_limit'&&ruleNumericValue(rule)!==null){
    const count=countRuleScopeOnDay(entries,assignment,slot.day,rule.scope)
    const value=ruleNumericValue(rule)!
    if(cmp==='maximum'&&count>=value) cost+=weight*(count-value+1)*4
    if(cmp==='minimum'&&count<value) cost+=weight
  }
  if(kind==='weekly_load'&&ruleNumericValue(rule)!==null){
    const count=countRuleScopeWeekly(entries,assignment,rule.scope)
    const value=ruleNumericValue(rule)!
    if((cmp==='maximum'||cmp==='equals')&&count>=value) cost+=weight*(count-value+1)*4
    if(cmp==='minimum'&&count<value) cost+=weight
  }
  if(kind==='consecutive_limit'&&ruleNumericValue(rule)!==null&&orderBySession){
    const run=consecutiveRunLength(entries,assignment,slot,rule.scope,orderBySession)
    const value=ruleNumericValue(rule)!
    if((cmp==='maximum'||cmp==='equals')&&run>value) cost+=weight*(run-value)*6
    if(cmp==='minimum'&&run<value) cost+=weight
  }
  return cost
}

const BUILTIN_EVALUABLE_CODES=new Set([
  'SIN_SOLAPE_DOCENTE',
  'SIN_SOLAPE_GRUPO',
  'RESPETAR_DISPONIBILIDAD_DOCENTE',
  'RESPETAR_FRANJAS_FIJAS',
  'REDUCIR_HUECOS_DOCENTES',
])

const STRUCTURED_EVALUABLE_KINDS=new Set([
  'avoid_slot',
  'availability',
  'daily_limit',
  'consecutive_limit',
  'fixed_slot',
  'weekly_load',
])

export function isRuleAutomaticallyEvaluable(rule:CenterRule){
  if(BUILTIN_EVALUABLE_CODES.has(rule.code)) return true
  return STRUCTURED_EVALUABLE_KINDS.has(ruleConditionKind(rule))
}
