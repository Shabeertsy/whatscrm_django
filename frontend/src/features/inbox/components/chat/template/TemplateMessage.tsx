import { LayoutTemplate } from 'lucide-react';
import { TextMessage } from '../text/TextMessage';


interface TemplateMessageProps {
  body: string;
}

export function TemplateMessage({ body }: TemplateMessageProps) {
  let templateName = "Template";
  let content = body;

  const newFormatMatch = body.match(/^\[Template:\s*([^\]]+)\]\n([\s\S]*)$/);
  if (newFormatMatch) {
    templateName = newFormatMatch[1];
    content = newFormatMatch[2].trim();
  } else {
    const oldFormatMatch = body.match(/^\[Template\]\s*(.*)$/);
    if (oldFormatMatch) {
      templateName = oldFormatMatch[1];
      content = "No template content saved.";
    }
  }

  return (
    <div className="flex flex-col gap-1.5 relative w-full">
      <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#007e3a] dark:text-[#00b359] bg-white/70 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-[#007e3a]/30 w-fit shadow-sm backdrop-blur-sm">
        <LayoutTemplate className="h-3.5 w-3.5" strokeWidth={2.5} />
        {templateName}
      </div>
      <div className="mt-1 opacity-95">
        {content && <TextMessage body={content} />}
      </div>
    </div>
  );
}
