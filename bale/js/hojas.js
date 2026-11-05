/* =========================================================
   balé — leer la lista de membresías en el navegador (área del estudio, solo la dueña)
   .xlsx (zip + XML) y .csv de Excel (coma o punto y coma, UTF-8 o Windows-1252),
   sin librerías: el .xlsx se descomprime con DecompressionStream del navegador.
   Es la misma lectura que bale-sistema/scripts/hojas.mjs e importar-membresias.mjs:
   si cambias los nombres de columnas aceptados, cámbialos en los dos.
   Nada de lo que se lee se guarda en el navegador ni se escribe en la consola.
   ========================================================= */
(function(){
"use strict";
const MAX_BYTES = 2*1024*1024;

function leerCsv(buf){
  let txt;
  try{ txt=new TextDecoder("utf-8",{fatal:true}).decode(buf); }catch(e){ txt=new TextDecoder("windows-1252").decode(buf); }
  txt=txt.replace(/^﻿/,"");
  const primera=txt.split(/\r?\n/,1)[0];
  const sep=(primera.match(/;/g)||[]).length>(primera.match(/,/g)||[]).length?";":",";
  const filas=[]; let fila=[], campo="", comillas=false;
  for(let i=0;i<txt.length;i++){
    const ch=txt[i];
    if(comillas){
      if(ch==='"'&&txt[i+1]==='"'){ campo+='"'; i++; }
      else if(ch==='"') comillas=false;
      else campo+=ch;
    }else if(ch==='"') comillas=true;
    else if(ch===sep){ fila.push(campo); campo=""; }
    else if(ch==="\n"||ch==="\r"){ if(ch==="\r"&&txt[i+1]==="\n") i++; fila.push(campo); filas.push(fila); fila=[]; campo=""; }
    else campo+=ch;
  }
  if(campo!==""||fila.length){ fila.push(campo); filas.push(fila); }
  return filas;
}

async function inflar(datos){
  if(!window.DecompressionStream) throw new Error("Este navegador no puede abrir .xlsx. Guarda la lista como CSV o usa Chrome.");
  const s=new Blob([datos]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function unzip(buf){
  const v=new DataView(buf.buffer,buf.byteOffset,buf.byteLength), u8=buf, td=new TextDecoder();
  let e=buf.length-22; while(e>=0&&v.getUint32(e,true)!==0x06054b50) e--;
  if(e<0) throw new Error("No es un archivo .xlsx válido.");
  const total=v.getUint16(e+10,true); let p=v.getUint32(e+16,true); const out={};
  for(let i=0;i<total;i++){
    const metodo=v.getUint16(p+10,true), tam=v.getUint32(p+20,true), ln=v.getUint16(p+28,true), lx=v.getUint16(p+30,true), lc=v.getUint16(p+32,true), off=v.getUint32(p+42,true);
    const nombre=td.decode(u8.subarray(p+46,p+46+ln));
    if(/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(nombre)){
      const ini=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true), datos=u8.subarray(ini,ini+tam);
      out[nombre]=td.decode(metodo===8?await inflar(datos):datos);
    }
    p+=46+ln+lx+lc;
  }
  return out;
}
const desc=s=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,"&");
const norm=s=>String(s??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

async function leerXlsx(buf){
  const z=await unzip(buf);
  if(!z["xl/workbook.xml"]) throw new Error("No es un archivo .xlsx válido.");
  const textos=xml=>[...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>desc(m[1])).join("");
  const compartidas=z["xl/sharedStrings.xml"]?[...z["xl/sharedStrings.xml"].matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>textos(m[1])):[];
  const wb=z["xl/workbook.xml"], rels=z["xl/_rels/workbook.xml.rels"]||"";
  const hojas=[...wb.matchAll(/<sheet\b[^>]*>/g)].map(m=>({nombre:desc((m[0].match(/\bname="([^"]*)"/)||[])[1]||""), rid:(m[0].match(/\br:id="([^"]+)"/)||[])[1]}));
  const rid=(hojas.find(h=>norm(h.nombre).trim().startsWith("membresia"))||hojas[0]||{}).rid;
  const destino=(rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))||rels.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`))||[])[1]||"worksheets/sheet1.xml";
  const xml=z["xl/"+destino.replace(/^\/?xl\//,"").replace(/^\//,"")];
  if(!xml) throw new Error("No encuentro la hoja de membresías en el archivo.");
  const filas=[];
  for(const m of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)){
    const r=+((m[0].match(/^<row\b[^>]*\br="(\d+)"/)||[])[1]||filas.length+1);
    while(filas.length<r-1) filas.push([]);
    const fila=[];
    for(const c of (m[1]||"").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
      const ref=(c[1].match(/\br="([A-Z]+)\d+"/)||[])[1], t=(c[1].match(/\bt="([^"]+)"/)||[])[1];
      const idx=ref?[...ref].reduce((a,ch)=>a*26+ch.charCodeAt(0)-64,0)-1:fila.length;
      const vv=(c[2]||"").match(/<v>([\s\S]*?)<\/v>/);
      let val="";
      if(t==="s") val=compartidas[+(vv&&vv[1])]??"";
      else if(t==="inlineStr") val=textos(c[2]||"");
      else if(vv) val=desc(vv[1]);
      while(fila.length<idx) fila.push("");
      fila[idx]=val;
    }
    filas.push(fila);
  }
  return filas;
}

// Títulos de columna → campo (igual que scripts/importar-membresias.mjs)
const clave=s=>norm(s).replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
function campo(h){
  const n=clave(h);
  if(n==="nombre"||n==="nombre_completo") return "nombre";
  if(/^(whatsapp|telefono|celular)/.test(n)) return "whatsapp";
  if(/^(correo|email|e_mail)/.test(n)) return "correo";
  if(n==="plan") return "plan";
  if(/^(inicio|desde|fecha_de_inicio|fecha_inicio)$/.test(n)) return "inicio";
  if(/^(fin|hasta|fecha_de_fin|fecha_fin)$/.test(n)) return "fin";
  if(/^(precio|monto)/.test(n)) return "precio";
  if(/^(ultimo_pago|fecha_(de_)?(ultimo_)?pago|fecha_del_ultimo_pago|pagado_el)$/.test(n)) return "ultimo_pago";
  if(/^banco/.test(n)) return "banco";
  if(/^(pago|pagado)$/.test(n)) return "pago";
  if(/^(forma_de_pago|forma_pago|metodo|metodo_de_pago)/.test(n)) return "forma_pago";
  let m=n.match(/^clase(?:_fija)?_?([123])/); if(m) return `clase_${m[1]}`;
  m=n.match(/^lugar_?([123])/); if(m) return `lugar_${m[1]}`;
  return null;
}
const fechaExcel=v=>/^\d{5}(\.\d+)?$/.test(String(v).trim())?new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5).toISOString().slice(0,10):v;

function filasDeHoja(tabla){
  const i=tabla.findIndex(f=>f.some(c=>campo(c)==="nombre"));
  if(i<0) throw new Error("No encuentro la fila de títulos (con la columna «Nombre»).");
  const campos=tabla[i].map(campo), out=[];
  tabla.slice(i+1).forEach((f,j)=>{
    if(!f.some(c=>String(c??"").trim()!=="")) return;
    const o={fila:i+j+2};
    campos.forEach((k,c)=>{ if(k) o[k]=String(f[c]??"").trim(); });
    o.inicio=fechaExcel(o.inicio??""); o.fin=fechaExcel(o.fin??""); if(o.ultimo_pago) o.ultimo_pago=fechaExcel(o.ultimo_pago);
    out.push(o);
  });
  return out;
}

// archivo (File) → [{fila, nombre, whatsapp, ...}]
async function leer(archivo){
  if(!archivo) throw new Error("Elige el archivo de la lista.");
  if(archivo.size>MAX_BYTES) throw new Error("El archivo pesa demasiado (máximo 2 MB).");
  const buf=new Uint8Array(await archivo.arrayBuffer());
  const xlsx=/\.xlsx$/i.test(archivo.name)||(buf[0]===0x50&&buf[1]===0x4b);
  if(!xlsx&&!/\.csv$/i.test(archivo.name)) throw new Error("Usa la plantilla en Excel (.xlsx) o un archivo .csv.");
  const filas=filasDeHoja(xlsx?await leerXlsx(buf):leerCsv(buf));
  if(!filas.length) throw new Error("El archivo no tiene filas con datos.");
  if(filas.length>300) throw new Error("Como mucho 300 filas por archivo.");
  return filas;
}

window.BALE_HOJAS = {leer, filasDeHoja, leerCsv};
})();
