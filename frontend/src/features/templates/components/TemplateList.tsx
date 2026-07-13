import React from 'react';
import { Loader2, FileText } from 'lucide-react';

interface TemplateListProps {
  templates: any[];
  loading: boolean;
  onEdit: (tmpl: any) => void;
  onDuplicate: (tmpl: any) => void;
  onDelete: (id: string) => void;
}

export function TemplateList({ templates, loading, onEdit, onDuplicate, onDelete }: TemplateListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {loading ? (
        <div className="col-span-full flex justify-center py-10">
          <Loader2 className="h-6 w-6 text-[#007e3a] animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-700">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 font-medium">No templates synced yet.</p>
        </div>
      ) : (
        templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full relative overflow-hidden group">
              {/* Category indicator line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${tmpl.category === 'MARKETING' ? 'bg-purple-500' : tmpl.category === 'UTILITY' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>

              <div className="flex justify-between items-start mb-4">
                <div>
                   <h4 className="font-extrabold text-base text-slate-900 dark:text-white truncate max-w-[180px]" title={tmpl.name}>
                     {tmpl.name}
                   </h4>
                   <div className="flex items-center gap-2 mt-1">
                     <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${tmpl.category === 'MARKETING' ? 'bg-purple-100 text-purple-700' : tmpl.category === 'UTILITY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{tmpl.category}</span>
                     <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{tmpl.language}</span>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                      tmpl.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : tmpl.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {tmpl.status}
                    </span>
                    
                    {tmpl.quality_score && (
                      <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        Quality: 
                        <span className={`h-2 w-2 rounded-full ${tmpl.quality_score === 'GREEN' ? 'bg-emerald-500' : tmpl.quality_score === 'YELLOW' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                      </span>
                    )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm flex gap-1 z-10 translate-x-4 group-hover:translate-x-0">
                  <button onClick={() => onDuplicate(tmpl)} className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Duplicate Template">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                  {tmpl.status !== 'APPROVED' && (
                    <button onClick={() => onEdit(tmpl)} className="p-1.5 text-slate-500 hover:text-[#007e3a] hover:bg-emerald-50 rounded-lg transition" title="Edit Template">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                  )}
                  <button onClick={() => { if(window.confirm('Delete this template from Meta?')) onDelete(tmpl.id) }} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete Template">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
              </div>

              {/* Chat Bubble UI */}
              <div className="flex-1 mt-2 mb-4 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r_QPEkMbpXb.png')] bg-[#efeae2] dark:bg-[#111b21] rounded-xl p-4 flex flex-col justify-start relative shadow-inner overflow-hidden">
                <div className="bg-white dark:bg-[#202c33] rounded-xl rounded-tl-none p-3 max-w-[95%] shadow-sm relative text-sm text-slate-800 dark:text-slate-200">
                  {/* WhatsApp tail */}
                  <svg viewBox="0 0 8 13" width="8" height="13" className="absolute -left-2 top-0 text-white dark:text-[#202c33]"><path opacity="1" fill="currentColor" d="M1.533,3.568L8,12.193V1H2.812 C1.042,1,0.474,2.156,1.533,3.568z"></path></svg>
                  
                  {tmpl.components?.find((c: any) => c.type === 'HEADER')?.text && (
                    <div className="font-bold text-black dark:text-white mb-1.5 text-[13px]">
                      {tmpl.components.find((c: any) => c.type === 'HEADER').text}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">
                    {tmpl.components?.find((c: any) => c.type === 'BODY')?.text || <span className="italic text-slate-400">No body text</span>}
                  </div>
                  
                  {tmpl.components?.find((c: any) => c.type === 'FOOTER')?.text && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-2 font-medium">
                      {tmpl.components.find((c: any) => c.type === 'FOOTER').text}
                    </div>
                  )}
                </div>
              </div>

              {tmpl.rejection_reason && (
                <div className="mt-auto bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 text-[11px] p-2.5 rounded-lg font-medium">
                  <strong className="block text-[10px] uppercase tracking-wider mb-0.5 opacity-80">Rejection Reason:</strong>
                  {tmpl.rejection_reason}
                </div>
              )}
            </div>
        ))
      )}
    </div>
  );
}
