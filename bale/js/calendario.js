/* =========================================================
   balé — archivo de calendario .ics (RFC 5545)
   Lo usan la página (reserva y calendario de la instructora), mi-reserva.html
   y el área del estudio. Horas en La Vega (UTC−4 todo el año).
   window.BALE_ICS = { archivo(nombre, eventos), descargar(texto, archivo) }
   eventos: [{uid, fecha:"YYYY-MM-DD", inicio:"HH:MM", fin:"HH:MM", resumen, descripcion, lugar}]
   ========================================================= */
(function(){
"use strict";
// Texto iCalendar: escapa y pliega líneas a 75 octetos
const icsEsc = s=>String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
function fold(line){
  const enc=new TextEncoder(); let out="", cur="", n=0;
  for(const ch of line){
    const b=enc.encode(ch).length;
    if(n+b>(out?74:75)){ out+=(out?"\r\n ":"")+cur; cur=""; n=0; }
    cur+=ch; n+=b;
  }
  return out+(out?"\r\n ":"")+cur;
}
const utc = d=>new Date(d.getTime()).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
const localStamp = (fecha,t)=>fecha.replace(/-/g,"")+"T"+t.replace(":","")+"00";
// La Vega usa UTC−4 todo el año (sin horario de verano)
const VTZ=["BEGIN:VTIMEZONE","TZID:America/Santo_Domingo","BEGIN:STANDARD","DTSTART:19700101T000000","TZOFFSETFROM:-0400","TZOFFSETTO:-0400","TZNAME:AST","END:STANDARD","END:VTIMEZONE"];

function archivo(nombre,eventos){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//bale//Reservas//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${icsEsc(nombre)}`,"X-WR-TIMEZONE:America/Santo_Domingo"].concat(VTZ);
  const now=utc(new Date());
  eventos.forEach(ev=>lines.push("BEGIN:VEVENT",`UID:${ev.uid}`,`DTSTAMP:${now}`,
    `DTSTART;TZID=America/Santo_Domingo:${localStamp(ev.fecha,ev.inicio)}`,`DTEND;TZID=America/Santo_Domingo:${localStamp(ev.fecha,ev.fin)}`,
    `SUMMARY:${icsEsc(ev.resumen)}`,`DESCRIPTION:${icsEsc(ev.descripcion)}`,`LOCATION:${icsEsc(ev.lugar)}`,"END:VEVENT"));
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n")+"\r\n";
}
function descargar(texto,nombreArchivo){
  const blob=new Blob([texto],{type:"text/calendar;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=nombreArchivo;
  document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
window.BALE_ICS = {archivo, descargar};
})();
