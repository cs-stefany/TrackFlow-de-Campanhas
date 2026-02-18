// Centralized formatting utilities for TrackFlow
import { format as fnsFormat, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

/**
 * Format currency value in EUR (Euro)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

/**
 * Format a number with fixed decimals
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Format ROAS value
 */
export const formatRoas = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Format date using pt-BR locale
 */
export const formatDate = (date: string | Date, formatStr: string = 'dd/MM/yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return fnsFormat(dateObj, formatStr, { locale: ptBR });
};

/**
 * Format date with time
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
};

/**
 * Format short date (e.g., "02 fev")
 */
export const formatShortDate = (date: string | Date): string => {
  return formatDate(date, 'dd MMM');
};

/**
 * Format weekday name
 */
export const formatWeekday = (date: string | Date): string => {
  return formatDate(date, 'EEEE');
};

/**
 * Format date for input fields (yyyy-MM-dd)
 */
export const formatDateInput = (date: Date): string => {
  return fnsFormat(date, 'yyyy-MM-dd');
};

/**
 * Copy text to clipboard and show toast
 */
export const copyToClipboard = async (text: string, successMessage: string = 'ID copiado!'): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (error) {
    toast.error('Erro ao copiar para área de transferência');
  }
};
