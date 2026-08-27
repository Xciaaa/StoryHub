export default function Codex({ project }) {
  const entries = [];
  if (project?.canvas_data?.nodes) {
    for (const node of project.canvas_data.nodes) {
      if (node.data?.type === 'Character') {
        entries.push(node);
      }
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="font-headline-md text-headline-md text-on-surface">Codex</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No characters documented yet. Add Character nodes on the canvas to build your codex.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="glass-panel rounded-lg p-4 border border-outline-variant/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-violet-glow text-[20px] mt-0.5">person</span>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">{entry.data?.label || 'Untitled'}</p>
                {entry.data?.description && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">{entry.data.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
