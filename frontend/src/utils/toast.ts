import React from 'react';
import toast from 'react-hot-toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

const recentToasts = new Set<string>();

export const showToast = (title: string, message: string, type: ToastType = 'info') => {
  console.log(`[Toast Triggered] ${title}: ${message} (${type})`);
  const toastId = `${title}-${message}`;

  if (recentToasts.has(toastId)) {
    console.log(`[Toast Blocked] Duplicate ID: ${toastId}`);
    return;
  }

  recentToasts.add(toastId);
  setTimeout(() => recentToasts.delete(toastId), 1000);

  const content = React.createElement(
    'div',
    { className: 'flex flex-col gap-0.5' },
    React.createElement('span', { className: 'font-bold text-sm' }, title),
    React.createElement('span', { className: 'text-xs opacity-90' }, message)
  );

  if (type === 'success') {
    toast.success(content, { id: toastId });
  } else if (type === 'error') {
    toast.error(content, { id: toastId });
  } else if (type === 'warning') {
    toast(content, { id: toastId, icon: '⚠️' });
  } else {
    toast(content, { id: toastId });
  }
};
