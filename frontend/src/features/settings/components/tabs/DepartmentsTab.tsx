import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Pencil,
  Search
} from 'lucide-react';
import { ConfirmDialog } from '../../../../components/shared/ConfirmDialog';
import { accountsApi, Department, DepartmentPayload } from '../../../../api/accounts';
import toast from 'react-hot-toast';
import { DepartmentModal } from '../modals/DepartmentModal';

export function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await accountsApi.listDepartments();
      const data = res.data;
      setDepartments(Array.isArray(data) ? data : (data as any).results ?? []);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(q) ||
        (dept.description && dept.description.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  const handleSave = async (payload: DepartmentPayload) => {
    try {
      if (editTarget) {
        await accountsApi.updateDepartment(editTarget.id, payload);
        toast.success('Department updated successfully');
      } else {
        await accountsApi.createDepartment(payload);
        toast.success('Department created successfully');
      }
      await fetchDepartments();
    } catch (error) {
      toast.error('Failed to save department');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await accountsApi.deleteDepartment(deleteTargetId);
      setDepartments((prev) => prev.filter((i) => i.id !== deleteTargetId));
      toast.success('Department deleted successfully');
      setDeleteTargetId(null);
    } catch (error) {
      toast.error('Failed to delete department');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await accountsApi.toggleDepartmentActive(id, currentStatus);
      await fetchDepartments();
      toast.success(currentStatus ? 'Department deactivated' : 'Department activated');
    } catch (error) {
      toast.error('Failed to toggle department status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Company Departments
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              {departments.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize your team members by department.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      {/* Search */}
      {departments.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments by name or description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007e3a]/30 focus:border-[#007e3a] transition"
          />
        </div>
      )}

      {/* Department List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#007e3a]" />
          <p className="text-xs text-slate-400">Loading departments...</p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#007e3a] hover:bg-[#00602d] text-white text-xs font-bold rounded-xl transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Department
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDepartments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${dept.is_active
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{dept.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${dept.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                      {dept.is_active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {dept.description ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{dept.description}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No description provided</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleToggle(dept.id, dept.is_active)}
                  disabled={togglingId === dept.id}
                  title={dept.is_active ? 'Deactivate Department' : 'Activate Department'}
                  className="p-2 text-slate-400 hover:text-[#007e3a] transition rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {togglingId === dept.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#007e3a]" />
                  ) : dept.is_active ? (
                    <ToggleRight className="h-5 w-5 text-[#007e3a] dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>

                <button
                  onClick={() => { setEditTarget(dept); setModalOpen(true); }}
                  title="Edit Department"
                  className="p-2 text-slate-400 hover:text-blue-600 transition rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeleteTargetId(dept.id)}
                  title="Delete Department"
                  className="p-2 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <DepartmentModal initial={editTarget} onClose={() => setModalOpen(false)} onSave={handleSave} />}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Department"
        description="Are you sure you want to delete this department?"
        confirmLabel="Delete Department"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
