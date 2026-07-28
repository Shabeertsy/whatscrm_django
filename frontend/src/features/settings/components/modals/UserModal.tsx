import React, { useState } from 'react';
import { Users, X, AlertTriangle, Loader2, Shield, Building2, Mail, Phone, User as UserIcon, Lock } from 'lucide-react';
import type { User, UserPayload, UserType, Department } from '../../../../api/accounts';
import { FormField } from '../ui/FormField';

export function UserModal({
  initial,
  departments = [],
  onClose,
  onSave,
}: {
  initial?: User | null;
  departments?: Department[];
  onClose: () => void;
  onSave: (payload: UserPayload) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<UserPayload>(
    initial
      ? {
        email: initial.email,
        username: initial.username || initial.email,
        first_name: initial.first_name || '',
        last_name: initial.last_name || '',
        phone_number: initial.phone_number || '',
        user_type: initial.user_type || 'staff',
        department: initial.department || '',
        is_active: initial.is_active,
        password: '',
      }
      : {
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        user_type: 'agent',
        department: '',
        is_active: true,
        password: '',
      }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof UserPayload) => (val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      console.error(err);
      const responseData = err?.response?.data;
      if (responseData && typeof responseData === 'object') {
        const messages = Object.entries(responseData)
          .map(([k, v]) => `${k.toUpperCase()}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ');
        setError(messages || 'Failed to save user account.');
      } else {
        setError('Failed to save user account. Please check if the email or username is already taken.');
      }
    } finally {
      setSaving(false);
    }
  };

  const roleOptions: { value: UserType; label: string; desc: string; badgeColor: string }[] = [
    { value: 'admin', label: 'Admin', desc: 'Full access', badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    { value: 'agent', label: 'CRM Agent', desc: 'Can manage assigned chats and contacts', badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { value: 'staff', label: 'General Staff', desc: 'Standard read', badgeColor: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#007e3a]/10 dark:bg-emerald-500/20 flex items-center justify-center border border-[#007e3a]/20">
              <Users className="h-5 w-5 text-[#007e3a] dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isEdit ? 'Edit User Account' : 'Create User Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit ? 'Update credentials and role assignments' : 'Add a new agent or administrator to your CRM'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="First Name"
              icon={UserIcon}
              value={form.first_name}
              onChange={set('first_name')}
              placeholder="e.g. Sarah"
            />
            <FormField
              label="Last Name"
              icon={UserIcon}
              value={form.last_name}
              onChange={set('last_name')}
              placeholder="e.g. Connor"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Email Address (Login Username)"
              icon={Mail}
              type="email"
              value={form.email}
              onChange={(val) => {
                setForm((prev) => ({ ...prev, email: val, username: val }));
                setError('');
              }}
              placeholder="sarah@company.com"
              required
              hint="Used to sign in to the CRM workspace."
            />
            <FormField
              label="Phone Number"
              icon={Phone}
              value={form.phone_number || ''}
              onChange={set('phone_number')}
              placeholder="+1 (555) 000-0000"
              hint="Optional contact number for notifications."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Department Assignment
              </label>
              <select
                value={form.department || ''}
                onChange={(e) => set('department')(e.target.value || null)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007e3a]/20 focus:border-[#007e3a] transition font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="">No Department (General)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} {dept.is_active ? '' : '(Inactive)'}
                  </option>
                ))}
              </select>
            </div>

            <FormField
              label={isEdit ? 'Reset Password' : 'Password'}
              icon={Lock}
              type="password"
              value={form.password || ''}
              onChange={set('password')}
              placeholder={isEdit ? 'Leave blank to keep unchanged' : 'At least 6 characters'}
              required={!isEdit}
              hint={isEdit ? '' : 'Initial login password.'}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              Role & Permissions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleOptions.map((role) => {
                const isSelected = form.user_type === role.value;
                return (
                  <div
                    key={role.value}
                    onClick={() => set('user_type')(role.value)}
                    className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col justify-between gap-1 ${isSelected
                      ? 'border-[#007e3a] bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm ring-1 ring-[#007e3a]'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{role.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${role.badgeColor}`}>
                        {role.value.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {role.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 rounded-xl">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#007e3a] hover:bg-[#00602d] rounded-xl transition shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Account...</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Create Account'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
