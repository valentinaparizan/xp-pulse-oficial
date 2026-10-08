// Hypothetical fallback only. The monthly rate is illustrative, not a live CDI quotation.
export function basicReturn(principal:number, start:string, end:string) {
 const from=Date.parse(start+'T00:00:00Z'), to=Date.parse(end+'T00:00:00Z');
 if(!Number.isFinite(principal)||principal<0||!Number.isFinite(from)||!Number.isFinite(to))throw new Error('Dados inválidos para rendimento básico');
 const days=Math.max(0,Math.round((to-from)/86400000));
 const income=Math.round(principal*(Math.pow(1.012,days/30)-1)*100)/100;
 return {principal,days,income,total:Math.round((principal+income)*100)/100};
}
