import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge di classi Tailwind: le classi passate per ultime vincono.
 * È l'helper standard dei componenti shadcn/ui.
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
