import React from 'react';
import { Bed } from 'lucide-react';

export function EmptyState() {
  return (
    <tr>
      <td colSpan={8} className="px-6 py-16 text-center">
        <Bed className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No rooms found for selected criteria.</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or dates.</p>
      </td>
    </tr>
  );
}
