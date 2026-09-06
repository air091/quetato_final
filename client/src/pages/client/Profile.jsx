import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const skillLevels = [["LB", "Low Beginner (LB)"], ["BEG", "Beginner (BEG)"], ["HB", "High Beginner (HB)"], ["LI", "Low Intermediate (LI)"], ["INT", "Intermediate (INT)"], ["UI", "Upper Intermediate (UI)"], ["ADV", "Advanced (ADV)"], ["EXP", "Expert (EXP)"]];
const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-400";
const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs font-medium text-stone-850 placeholder-stone-400 transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [skillLevel, setSkillLevel] = useState(user?.skillLevel || "LB");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setStatus(null);
    if (newPassword && newPassword !== confirmPassword) return setStatus({ error: true, message: "New passwords do not match." });
    setSaving(true);
    try {
      await updateProfile({ username: username.trim(), skillLevel, currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setStatus({ message: "Your profile has been updated." });
    } catch (error) { setStatus({ error: true, message: error.message || "Could not update profile." }); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto w-full max-w-2xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-orange-50 p-2.5 text-orange-500"><UserRound size={21} /></div><div><h2 className="text-xl font-bold tracking-tight text-stone-900">Profile settings</h2><p className="mt-0.5 text-xs text-stone-500">Manage your player identity and account security.</p></div></div>
    <form onSubmit={submit} className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      <section className="space-y-4 p-5 sm:p-6"><div><h3 className="text-sm font-bold text-stone-800">Player details</h3><p className="mt-1 text-xs text-stone-500">This name and level appear across your communities and sessions.</p></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="profile-username" className={labelClass}>Username</label><input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={60} className={inputClass} /></div><div><label htmlFor="profile-skill" className={labelClass}>Skill level</label><select id="profile-skill" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className={`${inputClass} cursor-pointer`}>{skillLevels.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div></div><div><span className={labelClass}>Email address</span><div className="rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-2.5 text-xs font-medium text-stone-500">{user?.email}</div></div></section>
      <section className="space-y-4 border-t border-stone-100 bg-stone-50/40 p-5 sm:p-6"><div><h3 className="text-sm font-bold text-stone-800">Change password</h3><p className="mt-1 text-xs text-stone-500">Leave these fields blank to keep your existing password.</p></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="current-password" className={labelClass}>Current password</label><input id="current-password" type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} /></div><div><label htmlFor="new-password" className={labelClass}>New password</label><input id="new-password" type={showPasswords ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} className={inputClass} /></div></div><div className="sm:max-w-[calc(50%-0.5rem)]"><label htmlFor="confirm-password" className={labelClass}>Confirm new password</label><div className="relative"><input id="confirm-password" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass} pr-10`} /><button type="button" onClick={() => setShowPasswords((shown) => !shown)} className="absolute inset-y-0 right-0 px-3 text-stone-400 hover:text-stone-700" aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>{showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div></section>
      <div className="flex flex-col gap-3 border-t border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div aria-live="polite">{status && <p className={`flex items-center gap-1.5 text-xs font-semibold ${status.error ? "text-red-600" : "text-emerald-600"}`}>{status.error ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}{status.message}</p>}</div><button disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">{saving && <Loader2 size={15} className="mr-2 animate-spin" />}{saving ? "Saving..." : "Save changes"}</button></div>
    </form>
  </div>;
}
