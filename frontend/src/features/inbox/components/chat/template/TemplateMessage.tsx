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
      <div className="flex items-center gap-1 text-[6.5px] sm:text-[7px] md:text-[7.5px] font-light uppercase tracking-wider text-[#007e3a] dark:text-[#00b359] bg-white/70 dark:bg-black/30 px-1.5 py-0.5 rounded border border-[#007e3a]/30 w-fit shadow-sm backdrop-blur-sm">
        <LayoutTemplate className="h-2 w-2 sm:h-2.5 sm:w-2.5" strokeWidth={1.5} />
        {templateName}
      </div>
      <div className="mt-1 opacity-95">
        {content && <TextMessage body={content} />}
      </div>
    </div>
  );
}
