export const money = (value: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export const date = (value: string) => new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(value.length === 10 ? value+'T12:00:00Z' : value));
export const shortDate = (value: string) => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')).replace('.','').toUpperCase();
export const daysFrom = (start: string, end: string) => Math.round((Date.parse(end.slice(0,10)+'T12:00:00Z')-Date.parse(start.slice(0,10)+'T12:00:00Z'))/86400000);
