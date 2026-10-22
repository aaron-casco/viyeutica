import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type {
  EducationStage,
  NormativeRule,
  NormativeRuleKind,
  NormativeSection,
  NormativeSource,
} from './project'

GlobalWorkerOptions.workerSrc = workerUrl

const uid=(prefix:string)=>prefix+'_'+crypto.randomUUID()

const SUBJECT_PATTERNS:[RegExp,string][]=[
  [/religión|atención educativa/i,'Religión / Atención Educativa'],
  [/lengua castellana/i,'Lengua Castellana y Literatura'],
  [/matemáticas?/i,'Matemáticas'],
  [/conocimiento del medio/i,'Conocimiento del Medio Natural, Social y Cultural'],
  [/educación física/i,'Educación Física'],
  [/educación artística/i,'Educación Artística'],
  [/valores cívicos|educación en valores/i,'Educación en Valores Cívicos y Éticos'],
  [/lengua extranjera|inglés/i,'Inglés / Lengua Extranjera'],
  [/segunda lengua extranjera/i,'Segunda Lengua Extranjera'],
  [/crecimiento en armonía/i,'Crecimiento en armonía'],
  [/descubrimiento y exploración del entorno/i,'Descubrimiento y exploración del entorno'],
  [/comunicación y representación de la realidad/i,'Comunicación y representación de la realidad'],
]

function cleanText(value:string){
  return value.replace(/\u00ad/g,'').replace(/\s+/g,' ').trim()
}

function inferStage(text:string):EducationStage|null{
  if(/educaci[oó]n infantil|\binfantil\b/i.test(text)) return 'Infantil'
  if(/educaci[oó]n primaria|\bprimaria\b/i.test(text)) return 'Primaria'
  if(/educaci[oó]n secundaria obligatoria|\bESO\b/i.test(text)) return 'ESO'
  if(/bachillerato/i.test(text)) return 'Bachillerato'
  return null
}

function inferLevel(text:string){
  const cycle=text.match(/\b(primer|segundo|tercer) ciclo\b/i)
  if(cycle) return cycle[0]
  const course=text.match(/\b([1-6])[.ººª]?\s*(?:de\s*)?(primaria|eso|bachillerato)\b/i)
  if(course) return course[0]
  const infant=text.match(/\b[345]\s*años\b/i)
  if(infant) return infant[0]
  return null
}

function inferSubject(text:string){
  for(const [pattern,label] of SUBJECT_PATTERNS){
    if(pattern.test(text)) return label
  }
  return null
}

function inferSection(text:string):NormativeSection{
  if(/horario lectivo del profesorado|plantilla funcional|reducci[oó]n|media jornada|profesorado/i.test(text)) return 'staff'
  if(/materia|área|curr[ií]cul|religión|atención educativa|lengua extranjera|matemáticas|educación física|educación artística/i.test(text)) return 'study_plan'
  if(/jornada|recreo|sesi[oó]n|tramo|periodo lectivo|per[ií]odo lectivo/i.test(text)) return 'schedule'
  if(/grupo|agrupamiento|ratio|unidad escolar/i.test(text)) return 'structure'
  if(/centro docente|tipo de centro|código de centro/i.test(text)) return 'center'
  if(/asignaci[oó]n|especialidad|impartici[oó]n/i.test(text)) return 'assignments'
  if(/restricci[oó]n|incompatibilidad|obligatori|garantizar|deber[aá]n|deberá/i.test(text)) return 'rules'
  return 'general'
}

function detectNumericRule(text:string,section:NormativeSection){
  const decimal='([0-9]+(?:[.,][0-9]+)?)'
  const patterns:{regex:RegExp;kind:NormativeRuleKind;unit:'hours'|'minutes'|'periods'}[]=[
    {regex:new RegExp(decimal+'\\s*horas?\\s+semanales?','i'),kind:'weekly_hours',unit:'hours'},
    {regex:new RegExp(decimal+'\\s*minutos?\\s+semanales?','i'),kind:'weekly_minutes',unit:'minutes'},
    {regex:new RegExp(decimal+'\\s*periodos?\\s+(?:lectivos?|semanales?)','i'),kind:section==='staff'?'teacher_periods':'weekly_periods',unit:'periods'},
    {regex:new RegExp(decimal+'\\s*per[ií]odos?\\s+(?:lectivos?|semanales?)','i'),kind:section==='staff'?'teacher_periods':'weekly_periods',unit:'periods'},
    {regex:new RegExp(decimal+'\\s*minutos?','i'),kind:'session_minutes',unit:'minutes'},
  ]
  for(const pattern of patterns){
    const match=text.match(pattern.regex)
    if(match){
      return {
        value:Number(match[1].replace(',','.')),
        kind:pattern.kind,
        unit:pattern.unit,
      }
    }
  }
  if(/media hora/i.test(text)) return {value:30,kind:'session_minutes' as NormativeRuleKind,unit:'minutes' as const}
  return null
}

function sentenceCandidates(text:string){
  const normalized=text
    .replace(/\s*\n\s*/g,' ')
    .replace(/([.;:])\s+/g,'$1\n')
  return normalized.split(/\n+/).map(cleanText).filter(sentence=>sentence.length>=24 && sentence.length<=650)
}

function buildRulesForPage(pageText:string,page:number,sourceId:string):NormativeRule[]{
  const rules:NormativeRule[]=[]
  const pageStage=inferStage(pageText)
  for(const excerpt of sentenceCandidates(pageText)){
    const section=inferSection(excerpt)
    const numeric=detectNumericRule(excerpt,section)
    const subject=inferSubject(excerpt)
    const strongNormative=/deber[aá]n|deberá|se dedicar[aá]n|se concretar[aá]|ser[aá] de|queda establecido|mínimo|m[aá]ximo/i.test(excerpt)
    const relevant=numeric || subject || strongNormative
    if(!relevant) continue
    const kind=numeric?.kind ?? (subject?'subject_rule':'other')
    const confidence=Math.min(0.98,
      0.48 +
      (numeric?0.2:0) +
      (strongNormative?0.16:0) +
      (subject?0.08:0) +
      ((inferStage(excerpt)||pageStage)?0.05:0)
    )
    rules.push({
      id:uid('rule'),
      sourceId,
      section,
      kind,
      label:subject ?? excerpt.slice(0,90)+(excerpt.length>90?'…':''),
      value:numeric?.value ?? null,
      unit:numeric?.unit ?? null,
      stage:inferStage(excerpt) ?? pageStage,
      level:inferLevel(excerpt),
      subject,
      page,
      excerpt,
      confidence,
      approved:false,
    })
  }
  const seen=new Set<string>()
  return rules.filter(rule=>{
    const key=[rule.kind,rule.value,rule.stage,rule.level,rule.subject,rule.excerpt].join('|').toLowerCase()
    if(seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function sha256(file:File){
  const buffer=await file.arrayBuffer()
  const hash=await crypto.subtle.digest('SHA-256',buffer)
  return Array.from(new Uint8Array(hash)).map(value=>value.toString(16).padStart(2,'0')).join('')
}

async function extractPdf(file:File){
  const data=new Uint8Array(await file.arrayBuffer())
  const pdf=await getDocument({data}).promise
  const pages:{page:number;text:string}[]=[]
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
    const page=await pdf.getPage(pageNumber)
    const content=await page.getTextContent()
    const text=cleanText(content.items.map(item=>('str' in item ? item.str : '')).join(' '))
    pages.push({page:pageNumber,text})
  }
  return pages
}

async function extractPlainText(file:File){
  return [{page:1,text:cleanText(await file.text())}]
}

export async function analyzeNormativeFile(file:File){
  const lower=file.name.toLowerCase()
  const isPdf=file.type==='application/pdf'||lower.endsWith('.pdf')
  const isText=file.type.startsWith('text/')||lower.endsWith('.txt')||lower.endsWith('.md')
  if(!isPdf&&!isText){
    throw new Error('Formato no compatible todavía. Usa PDF, TXT o Markdown.')
  }

  const sourceId=uid('norm')
  const pages=isPdf ? await extractPdf(file) : await extractPlainText(file)
  const fullText=pages.map(item=>item.text).join('\n')
  if(fullText.trim().length<40){
    throw new Error('No se ha podido extraer texto suficiente del documento. Puede ser un PDF escaneado y requerir OCR.')
  }

  const rules=pages.flatMap(item=>buildRulesForPage(item.text,item.page,sourceId))
  const stages=Array.from(new Set(pages.map(item=>inferStage(item.text)).filter(Boolean))) as EducationStage[]
  const source:NormativeSource={
    id:sourceId,
    name:file.name,
    mimeType:file.type||'application/octet-stream',
    size:file.size,
    pageCount:pages.length,
    extractedChars:fullText.length,
    sha256:await sha256(file),
    addedAt:new Date().toISOString(),
    stages,
    ruleCount:rules.length,
  }
  return {source,rules}
}
