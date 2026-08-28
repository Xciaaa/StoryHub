import { useState } from 'react';

const SECTIONS = [
  {
    title: 'Getting Started',
    icon: 'rocket_launch',
    items: [
      { title: 'Create a Project', body: 'From the Dashboard, click New Story. Enter a title, optional genre/description/cover image, then open the canvas.' },
      { title: 'Add Your First Nodes', body: 'Use the sidebar selector + Add button, or double-click the canvas. Each node becomes a Codex entry.' },
      { title: 'Connect Ideas', body: 'Drag from a node handle to another node to create relationships.' },
      { title: 'Save & Autosave', body: 'The editor autosaves drafts. Use the save button for an explicit server save.' },
    ],
  },
  {
    title: 'Canvas & Nodes',
    icon: 'hub',
    items: [
      { title: 'Node Types', body: 'Character, Location, Plot Event, Lore, Item, Faction, Theme.' },
      { title: 'Edit a Node', body: 'Click a node to open the inspector. Edit title, status, description, notes, and image.' },
      { title: 'Delete', body: 'Delete moves entries to Graveyard, where you can restore or permanently delete them.' },
      { title: 'Multi-Handle Connections', body: 'Nodes expose multiple connection handles for richer relationship mapping.' },
    ],
  },
  {
    title: 'Codex',
    icon: 'menu_book',
    items: [
      { title: 'Browse Entries', body: 'View all world elements in a searchable bento grid.' },
      { title: 'Filters', body: 'Use the left sidebar to filter by category and status.' },
      { title: 'Detail View', body: 'Click any card to open a detail modal with summary, notes, and relationships.' },
      { title: 'Faction Key Figures', body: 'Factions support a Key Figures field shown as tags on cards and in detail view.' },
    ],
  },
  {
    title: 'Timeline & Atlas',
    icon: 'timeline',
    items: [
      { title: 'Timeline', body: 'Shows only Plot Event nodes, ordered vertically by position.' },
      { title: 'Atlas', body: 'Location nodes are shown on a spatial map. Drag to explore world geography.' },
    ],
  },
  {
    title: 'Project Settings',
    icon: 'settings',
    items: [
      { title: 'Visibility', body: 'Toggle between Private and Public from the editor sidebar or Dashboard.' },
      { title: 'Cover Image', body: 'Upload a cover image in the New Story modal, or click the project image in the editor sidebar to change it.' },
      { title: 'Genre', body: 'Set genre when creating a project. It appears in the editor sidebar.' },
    ],
  },
  {
    title: 'Tips',
    icon: 'lightbulb',
    items: [
      { title: 'Soft Delete', body: 'Deleted items go to Graveyard. You can restore them or delete them permanently there.' },
      { title: 'Images', body: 'Upload images to Codex entries and project covers. Images are stored locally and served securely.' },
      { title: 'Search', body: 'Use the Codex search to find entries by title, description, notes, or key figures.' },
    ],
  },
];

export default function Help() {
  const [open, setOpen] = useState({});

  const toggle = (title) => {
    setOpen((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="mb-6 px-6 pt-6">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Help Center</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Guides and tips to help you build your world.</p>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-6 pb-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="glass-panel rounded-xl border border-outline-variant/30 overflow-hidden">
            <button
              onClick={() => toggle(section.title)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-variant/10 transition-colors"
            >
              <span className="material-symbols-outlined text-indigo-electric">{section.icon}</span>
              <span className="font-label-md text-label-md text-on-surface flex-1">{section.title}</span>
              <span className="material-symbols-outlined text-on-surface-variant transition-transform" style={{ transform: open[section.title] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                expand_more
              </span>
            </button>
            {open[section.title] && (
              <div className="px-4 pb-4 space-y-3">
                {section.items.map((item) => (
                  <div key={item.title} className="p-3 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                    <h4 className="font-label-md text-label-md text-on-surface mb-1">{item.title}</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
