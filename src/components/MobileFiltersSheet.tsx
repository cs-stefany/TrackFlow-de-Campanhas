import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface MobileFiltersSheetProps {
  activeCount: number;
  children: ReactNode;
  onClear: () => void;
}

export function MobileFiltersSheet({
  activeCount,
  children,
  onClear,
}: MobileFiltersSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="relative h-11 shrink-0 gap-2 px-3 md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] overflow-y-auto rounded-t-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>Filtrar resultados</SheetTitle>
          <SheetDescription>Escolha somente o que deseja ver.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 py-5">{children}</div>
        <SheetFooter className="grid grid-cols-2 gap-2 space-y-0">
          <Button type="button" variant="outline" onClick={onClear}>
            Limpar
          </Button>
          <SheetClose asChild>
            <Button type="button">Ver resultados</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
