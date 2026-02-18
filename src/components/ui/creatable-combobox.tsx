import * as React from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface CreatableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew?: (value: string) => Promise<void>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  createText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CreatableCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Selecionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado encontrado.',
  createText = 'Criar',
  isLoading = false,
  disabled = false,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Check if search value already exists
  const exactMatch = options.some(
    (opt) => opt.label.toLowerCase() === searchValue.toLowerCase()
  );

  // Show create option if there's a search value and no exact match
  const showCreateOption = searchValue.trim() && !exactMatch && onCreateNew;

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchValue('');
  };

  const handleCreate = async () => {
    if (!onCreateNew || !searchValue.trim()) return;

    setIsCreating(true);
    try {
      await onCreateNew(searchValue.trim());
      // The parent component should update the options and value after creation
      setSearchValue('');
      setOpen(false);
    } catch (error) {
      console.error('Error creating new option:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </span>
          ) : selectedOption ? (
            selectedOption.label
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 bg-popover border border-border shadow-lg z-50" 
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredOptions.length === 0 && !showCreateOption && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            
            {showCreateOption && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreate}
                  disabled={isCreating}
                  className="cursor-pointer"
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  <span>
                    {createText} "<span className="font-medium">{searchValue}</span>"
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
