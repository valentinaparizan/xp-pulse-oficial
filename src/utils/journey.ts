import type { Option } from '../types/market';
import { validOption } from './optionFilters.ts';
import { optionCost } from './optionsMath.ts';

export function journeyAvailability(options:Option[], ticker:string, budget:number, expiry:string) {
 const series=options.filter(o=>validOption(o)&&o.underlying===ticker);
 const min=(items:Option[])=>items.length?Math.min(...items.map(optionCost)):null;
 const validBudget=Number.isFinite(budget)&&budget>0&&budget<=1000000;
 const affordable=(items:Option[])=>validBudget&&items.some(o=>optionCost(o)<=budget);
 const dates=[...new Set(series.map(o=>o.expiry))].sort().map(date=>{const items=series.filter(o=>o.expiry===date);return {date,minimum:min(items),enabled:affordable(items)};});
 const directions=(['up','down'] as const).map(direction=>{const items=series.filter(o=>o.expiry===expiry&&o.type===(direction==='up'?'CALL':'PUT'));return {direction,minimum:min(items),enabled:affordable(items)};});
 return {minimum:min(series),dates,directions,canContinue:dates.some(d=>d.date===expiry&&d.enabled)};
}
export function safeJourneyStep(requested:number, termsValid:boolean, optionValid:boolean, reasonValid:boolean) {
 if(requested>=2&&!termsValid)return 1;
 if(requested>=3&&!optionValid)return 2;
 if(requested>=4&&!reasonValid)return 3;
 return requested;
}
