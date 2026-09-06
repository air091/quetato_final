import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const skillLevels = [["LB", "Low Beginner (LB)"], ["BEG", "Beginner (BEG)"], ["HB", "High Beginner (HB)"], ["LI", "Low Intermediate (LI)"], ["INT", "Intermediate (INT)"], ["UI", "Upper Intermediate (UI)"], ["ADV", "Advanced (ADV)"], ["EXP", "Expert (EXP)"]];
const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-400";
const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs font-medium text-stone-850 transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10";
const actionClass = "rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300";

export default function Profile() {
  const { user, updateProfile, addSportToProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [skillLevel, setSkillLevel] = useState(user?.skillLevel || "LB");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addingSport, setAddingSport] = useState(false);
  const [sport, setSport] = useState("badminton");
  const [sportSkillLevel, setSportSkillLevel] = useState("LB");
  const cancel = () => { setUsername(user?.username || ""); setSkillLevel(user?.skillLevel || "LB"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setStatus(null); setEditing(null); };
  const startEditing = (section) => { setStatus(null); setEditing(section); };
  const availableSports = ["badminton", "volleyball"].filter((value) => !user?.sports?.some((userSport) => userSport.sport === value));
  const beginAddingSport = () => { setStatus(null); setSport(availableSports[0]); setAddingSport(true); };
  const submit = async (event) => {
    event.preventDefault(); setStatus(null);
    if (editing === "password" && newPassword !== confirmPassword) return setStatus({ error: true, message: "New passwords do not match." });
    setSaving(true);
    try {
      await updateProfile(editing === "details" ? { username: username.trim(), skillLevel } : { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setEditing(null);
      setStatus({ message: editing === "details" ? "Your profile has been updated." : "Your password has been changed." });
    } catch (error) { setStatus({ error: true, message: error.message || "Could not update profile." }); }
    finally { setSaving(false); }
  };
  const addSport = async () => {
    setStatus(null); setSaving(true);
    try {
      await addSportToProfile({ sport, skillLevel: sportSkillLevel });
      setAddingSport(false);
      setStatus({ message: "Sport added to your profile." });
    } catch (error) { setStatus({ error: true, message: error.message || "Could not add sport." }); }
    finally { setSaving(false); }
  };
  const skillLabel = skillLevels.find(([value]) => value === (user?.skillLevel || skillLevel))?.[1] || skillLevel;

  return <div className="mx-auto w-full max-w-2xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-orange-50 p-2.5 text-orange-500"><UserRound size={21} /></div><div><h2 className="text-xl font-bold tracking-tight text-stone-900">Profile settings</h2><p className="mt-0.5 text-xs text-stone-500">Manage your player identity and account security.</p></div></div>
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm"><form onSubmit={submit}>
      <section className="space-y-4 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-stone-800">Player details</h3><p className="mt-1 text-xs text-stone-500">This name and level appear across your communities and sessions.</p></div>{editing !== "details" && <button type="button" onClick={() => startEditing("details")} className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">Edit profile</button>}</div>
        {editing === "details" ? <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="profile-username" className={labelClass}>Username</label><input id="profile-username" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={60} className={inputClass} /></div><div><label htmlFor="profile-skill" className={labelClass}>Skill level</label><select id="profile-skill" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className={`${inputClass} cursor-pointer`}>{skillLevels.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div></div> : <div className="grid gap-4 sm:grid-cols-2"><div><span className={labelClass}>Username</span><p className="text-sm font-semibold text-stone-700">{user?.username}</p></div><div><span className={labelClass}>Skill level</span><p className="text-sm font-semibold text-stone-700">{skillLabel}</p></div></div>}
        <div><span className={labelClass}>Email address</span><div className="rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-2.5 text-xs font-medium text-stone-500">{user?.email}</div></div>{editing === "details" && <Actions cancel={cancel} saving={saving} label="Save profile" />}
      </section>
      <section className="space-y-4 border-t border-stone-100 bg-stone-50/40 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-stone-800">Sports</h3><p className="mt-1 text-xs text-stone-500">Your sports and current skill levels.</p></div>{availableSports.length > 0 && !addingSport && <button type="button" onClick={beginAddingSport} className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">Add sport</button>}</div>
        {user?.sports?.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{user.sports.map((userSport) => <div key={userSport.id} className="rounded-xl border border-stone-200 bg-white px-3.5 py-3"><p className="text-sm font-bold capitalize text-stone-800">{userSport.sport}</p><p className="mt-0.5 text-xs text-stone-500">{skillLevels.find(([value]) => value === userSport.skillLevel)?.[1]}</p></div>)}</div>}
        {addingSport && <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="profile-sport" className={labelClass}>Sport</label><select id="profile-sport" value={sport} onChange={(event) => setSport(event.target.value)} className={`${inputClass} cursor-pointer`}>{availableSports.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div><div><label htmlFor="sport-skill" className={labelClass}>Skill level</label><select id="sport-skill" value={sportSkillLevel} onChange={(event) => setSportSkillLevel(event.target.value)} className={`${inputClass} cursor-pointer`}>{skillLevels.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setAddingSport(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-stone-500 hover:bg-stone-100">Cancel</button><button type="button" onClick={addSport} disabled={saving} className={actionClass}>{saving && <Loader2 size={15} className="mr-2 inline animate-spin" />}Add sport</button></div></div>}
        {user?.sports?.length > 0 && availableSports.length === 0 && <p className="text-xs text-stone-500">All available sports have been added to your profile.</p>}
      </section>
      <section className="space-y-4 border-t border-stone-100 bg-stone-50/40 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-stone-800">Password</h3><p className="mt-1 text-xs text-stone-500">Keep your account secure with a strong password.</p></div>{editing !== "password" && <button type="button" onClick={() => startEditing("password")} className="shrink-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">Change password</button>}</div>
        {editing === "password" && <><div className="grid gap-4 sm:grid-cols-2"><PasswordInput id="current-password" label="Current password" value={currentPassword} onChange={setCurrentPassword} type={showPasswords ? "text" : "password"} /><PasswordInput id="new-password" label="New password" value={newPassword} onChange={setNewPassword} type={showPasswords ? "text" : "password"} minLength={8} /></div><div className="sm:max-w-[calc(50%-0.5rem)]"><label htmlFor="confirm-password" className={labelClass}>Confirm new password</label><div className="relative"><input id="confirm-password" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={`${inputClass} pr-10`} /><button type="button" onClick={() => setShowPasswords((shown) => !shown)} className="absolute inset-y-0 right-0 px-3 text-stone-400 hover:text-stone-700" aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>{showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div><Actions cancel={cancel} saving={saving} label="Change password" /></>}
      </section>
    </form>{status && <div aria-live="polite" className={`flex items-center gap-1.5 border-t border-stone-100 px-5 py-3 text-xs font-semibold ${status.error ? "text-red-600" : "text-emerald-600"}`}>{status.error ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}{status.message}</div>}</div>
  </div>;
}

function PasswordInput({ id, label, value, onChange, type, minLength }) { return <div><label htmlFor={id} className={labelClass}>{label}</label><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required minLength={minLength} className={inputClass} /></div>; }
function Actions({ cancel, saving, label }) { return <div className="flex justify-end gap-2"><button type="button" onClick={cancel} className="rounded-xl px-4 py-2.5 text-xs font-bold text-stone-500 hover:bg-stone-100">Cancel</button><button disabled={saving} className={actionClass}>{saving && <Loader2 size={15} className="mr-2 inline animate-spin" />}{label}</button></div>; }
