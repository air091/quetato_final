import React from "react";
import Modal from "../../createPortal";
import { UserPlus, X, Loader2 } from "lucide-react";

const AddPlayerModal = ({
  isOpen,
  onClose,
  onSubmit,
  newPlayerNames,
  setNewPlayerNames,
  skillLevel,
  setSkillLevel,
  SKILL_LEVEL_LABELS = {},
  isSubmitting,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-md transform overflow-hidden rounded-xl border border-stone-200 bg-white p-6 text-left align-middle shadow-xl transition-all z-10 animate-in fade-in zoom-in-95 duration-150">
          <header className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div className="flex items-center gap-x-2 text-stone-900">
              <UserPlus size={18} className="text-stone-500" />
              <h3 className="text-base font-bold">Add Static Players</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 outline-none p-1 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <X size={16} />
            </button>
          </header>

          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-y-4">
            {/* Input Element: Player Usernames Textarea */}
            <div className="flex flex-col gap-y-1.5">
              <label
                htmlFor="modal-player-names"
                className="text-xs font-bold text-stone-700 uppercase tracking-wider"
              >
                Player Usernames (One per line)
              </label>
              <textarea
                id="modal-player-names"
                required
                autoFocus
                rows={5}
                disabled={isSubmitting}
                placeholder={"JohnDoe\nJaneDoe\nPlayerThree"}
                value={newPlayerNames}
                onChange={(e) => setNewPlayerNames(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-lg text-sm text-stone-800 placeholder-stone-400 font-medium outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all disabled:opacity-60 resize-none font-mono"
              />
              <p className="text-[11px] text-stone-400 font-medium">
                Press Enter to add multiple players at once.
              </p>
            </div>

            {/* Input Element: Skill Level Selector Component */}
            <div className="flex flex-col gap-y-1.5">
              <label
                htmlFor="modal-skill-level"
                className="text-xs font-bold text-stone-700 uppercase tracking-wider"
              >
                Skill Level (Applies to all)
              </label>
              <select
                id="modal-skill-level"
                value={skillLevel}
                disabled={isSubmitting}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-lg text-sm text-stone-800 font-medium outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all disabled:opacity-60 cursor-pointer"
              >
                {Object.entries(SKILL_LEVEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <footer className="flex items-center justify-end gap-x-2 pt-4 border-t border-stone-100 mt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer outline-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newPlayerNames.trim()}
                className="flex items-center gap-x-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm outline-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Creating Group...
                  </>
                ) : (
                  "Add Players"
                )}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AddPlayerModal;
