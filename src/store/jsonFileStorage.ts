export type StoredProjectJson={
  id:string
  name:string
  size:number
  addedAt:string
  rawText:string
}

const STORAGE_KEY='viyeutica.imported-json-files.v1'

export function loadStoredProjectJsons():StoredProjectJson[]{
  try{
    const parsed=JSON.parse(window.localStorage.getItem(STORAGE_KEY)??'[]')
    return Array.isArray(parsed)?parsed:[]
  }catch{
    return []
  }
}

function persist(items:StoredProjectJson[]){
  window.localStorage.setItem(STORAGE_KEY,JSON.stringify(items))
}

export async function storeProjectJson(file:File,rawText:string){
  const hashBuffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rawText))
  const hash=Array.from(new Uint8Array(hashBuffer)).map(value=>value.toString(16).padStart(2,'0')).join('')
  const id='json_'+hash
  const current=loadStoredProjectJsons()
  const item:StoredProjectJson={id,name:file.name,size:file.size,addedAt:new Date().toISOString(),rawText}
  persist([item,...current.filter(entry=>entry.id!==id)])
  return item
}

export function deleteStoredProjectJson(id:string){
  persist(loadStoredProjectJsons().filter(item=>item.id!==id))
}
