import React, { useState } from 'react';
import { CTag, TAG_COLORS } from '../utils/types';
import { contactsApi } from '../../../api/contacts';
import { Tag, Plus, Trash2, Loader2 } from 'lucide-react';



interface TagManagerProps {
  tags: CTag[];
  onCreated: (t: CTag) => void;
  onDeleted: (id: string) => void;
}

export function TagManager({ tags, onCreated, onDeleted }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const res = await contactsApi.createTag({ name: newTagName.trim(), color: selectedColor });
      onCreated(res.data);
      setNewTagName('');
    } catch {}
    setCreating(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Tag className="h-4 w-4 text-[#007e3a]" /> Tags
      </h3>
      <form onSubmit={handleCreate} className="space-y-3 mb-4">
        <input
          type="text"
          value={newTagName}
          onChange={e => setNewTagName(e.target.value)}
          placeholder="New tag name..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#007e3a]"
        />
        <div className="flex gap-2 flex-wrap">
          {TAG_COLORS.map(c => (
            <button
              type="button" key={c}
              onClick={() => setSelectedColor(c)}
              className={`h-5 w-5 rounded-full transition ${selectedColor === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={creating || !newTagName.trim()}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#007e3a] hover:bg-[#00602d] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create Tag
        </button>
      </form>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition group">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tag.name}</span>
              <span className="text-[10px] text-slate-400">({tag.contact_count})</span>
            </div>
            <button
              onClick={() => onDeleted(tag.id)}
              className="text-red-400 hover:text-red-600 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {tags.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No tags yet</p>}
      </div>
    </div>
  );
}
