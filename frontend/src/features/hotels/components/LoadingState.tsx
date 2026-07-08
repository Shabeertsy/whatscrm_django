export function LoadingState() {
  return (
    <tr className="h-[500px]">
      <td colSpan={8} className="text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007e3a]" />
          <span className="text-sm text-slate-500">Loading rooms...</span>
        </div>
      </td>
    </tr>
  );
}
