import React from 'react';
import { Loader2, FileText, Copy, Edit2, Trash2, Globe, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface TemplateListProps {
  templates: any[];
  loading: boolean;
  onEdit: (tmpl: any) => void;
  onDuplicate: (tmpl: any) => void;
  onDelete: (id: string) => void;
}

export function TemplateList({ templates, loading, onEdit, onDuplicate, onDelete }: TemplateListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-[#007e3a] animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-md mx-auto my-8">
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#007e3a]">
          <FileText className="h-7 w-7" />
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No templates found</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Create a new template or sync from your Meta WhatsApp Business account.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
      {templates.map((tmpl) => {
        const header = tmpl.components?.find((c: any) => c.type === 'HEADER')?.text;
        const body = tmpl.components?.find((c: any) => c.type === 'BODY')?.text;
        const footer = tmpl.components?.find((c: any) => c.type === 'FOOTER')?.text;

        const isApproved = tmpl.status === 'APPROVED';
        const isRejected = tmpl.status === 'REJECTED';

        const categoryBadgeColor = 
          tmpl.category === 'MARKETING' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40' :
          tmpl.category === 'UTILITY' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40' :
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

        const typeBadgeColor = 
          tmpl.template_type === 'CAMPAIGN' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40' :
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40';

        return (
          <div
            key={tmpl.id}
            className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-[#007e3a] shrink-0" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate" title={tmpl.name}>
                      {tmpl.name}
                    </h4>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${categoryBadgeColor}`}>
                      {tmpl.category}
                    </span>
                    {tmpl.template_type && (
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${typeBadgeColor}`}>
                        {tmpl.template_type}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                      <Globe className="h-3 w-3 text-slate-400" />
                      {tmpl.language}
                    </span>
                  </div>
                </div>

                {/* Status Pill */}
                <span
                  className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    isApproved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50'
                      : isRejected
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/50'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/50'
                  }`}
                >
                  {isApproved ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : isRejected ? (
                    <XCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-amber-500" />
                  )}
                  {tmpl.status}
                </span>
              </div>

              {/* Template Chat Bubble Preview */}
              <div className="bg-[#f0f4f1] dark:bg-slate-800/80 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 my-3 border border-emerald-900/5 dark:border-slate-700/60 shadow-inner relative font-sans">
                {header && <p className="font-bold text-slate-900 dark:text-white mb-1.5 text-[13px] border-b border-slate-200/60 dark:border-slate-700 pb-1">{header}</p>}
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
                  {body || <span className="italic text-slate-400">No body text content</span>}
                </p>
                {footer && <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 italic">{footer}</p>}
              </div>

              {tmpl.rejection_reason && (
                <div className="text-xs text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40 flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Rejection Reason: </span>
                    {tmpl.rejection_reason}
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Actions Bar */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {tmpl.quality_score ? `Quality: ${tmpl.quality_score}` : 'WhatsApp Template'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDuplicate(tmpl)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  title="Duplicate Template"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {!isApproved && (
                  <button
                    onClick={() => onEdit(tmpl)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                    title="Edit Template"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(tmpl.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  title="Delete Template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
