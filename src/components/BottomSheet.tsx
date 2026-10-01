import type { ReactNode } from 'react';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
export function BottomSheet({label,title,description,children,onRead}:{label:ReactNode;title:string;description:string;children?:ReactNode;onRead?:()=>void}){
  return <Sheet><SheetTrigger asChild><button className="text-link">{label}</button></SheetTrigger><SheetContent side="bottom" className="sheet"><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader><div className="sheet-body">{children}</div><SheetFooter><SheetClose asChild><button className="xp-primary" onClick={onRead}>Entendi</button></SheetClose></SheetFooter></SheetContent></Sheet>;
}
