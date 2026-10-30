import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Camera, Download, KeyRound, Lock, RefreshCw, Save, ShieldCheck, SlidersHorizontal, Trash2, UserRound, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { securityService } from '../services/securityService';
import { projectService } from '../services/projectService';
import '../styles/SettingsPage.css';

const tabs = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'users', label: 'User', icon: Users },
  { id: 'permissions', label: 'Akses', icon: SlidersHorizontal },
  { id: 'logs', label: 'Activity Log', icon: ShieldCheck },
  { id: 'archive', label: 'Archive', icon: Archive },
];
const roleOrder = ['OWNER', 'ADMIN', 'PERENCANA', 'PELAKSANA', 'FINANCE', 'PURCHASING'];
const modules = ['APPROVAL', 'PROJECT', 'SURVEY', 'SURVEY_3D', 'DESIGN_QUOTATION', 'BV', 'RAB', 'SPK', 'PROFILE', 'AUTH'];
const dateText = (value) => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

export default function SettingsPage({ currentUser, onUserUpdated }) {
  const [active, setActive] = useState('profile');
  const [profile, setProfile] = useState(currentUser || {});
  const [form, setForm] = useState({ name: '', username: '', email: '', currentPassword: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [permissionData, setPermissionData] = useState(null);
  const [permissionRole, setPermissionRole] = useState('ADMIN');
  const [permissionDraft, setPermissionDraft] = useState({});
  const [memberProjects, setMemberProjects] = useState([]);
  const [memberProjectId, setMemberProjectId] = useState('');
  const [memberDraft, setMemberDraft] = useState(new Set());
  const [memberCounts, setMemberCounts] = useState(new Map());
  const [memberProjectQuery, setMemberProjectQuery] = useState('');
  const [memberUserQuery, setMemberUserQuery] = useState('');
  const [accessTab, setAccessTab] = useState('pages');
  const [archives, setArchives] = useState([]);
  const [integration, setIntegration] = useState(null);
  const [filters, setFilters] = useState({ module: 'APPROVAL', role: '', userId: '', status: '', from: '', to: '', limit: 50 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoInput = useRef(null);
  const membershipMapRef = useRef(new Map());

  const loadProfile = async () => {
    const response = await securityService.getMe();
    setProfile(response.data);
    setForm({ name: response.data.name || '', username: response.data.username || '', email: response.data.email || '', currentPassword: '' });
  };
  const loadUsers = async () => { const response = await securityService.getUsers(); setUsers(response.data || []); };
  const loadPermissions = async () => { if (profile.role !== 'OWNER' && currentUser?.role !== 'OWNER') return; const response = await securityService.getPermissionTemplates(); setPermissionData(response.data); setPermissionDraft(response.data?.template?.ADMIN || {}); };
  const loadMemberships = async () => {
    if (profile.role !== 'OWNER' && currentUser?.role !== 'OWNER') return;
    const [projectsResponse, membershipResponse] = await Promise.all([projectService.getAll(), securityService.getProjectMemberships()]);
    const projects = (projectsResponse || []).map((project) => ({ id: project.id, name: project.name }));
    setMemberProjects(projects);
    const grouped = new Map();
    for (const entry of membershipResponse.data || []) {
      const projectId = entry.project?.id;
      const userId = entry.user?.id;
      if (!projectId || !userId) continue;
      const list = grouped.get(projectId) || new Set();
      list.add(userId);
      grouped.set(projectId, list);
    }
    setMemberCounts(new Map([...grouped].map(([id, set]) => [id, set.size])));
    membershipMapRef.current = grouped;
    const first = projects[0]?.id || '';
    const selected = memberProjectId && projects.some((project) => project.id === memberProjectId) ? memberProjectId : first;
    setMemberProjectId(selected);
    setMemberDraft(selected ? new Set(grouped.get(selected) || []) : new Set());
  };
  const selectMemberProject = (projectId) => {
    setMemberProjectId(projectId);
    setMemberDraft(new Set(membershipMapRef.current?.get(projectId) || []));
  };
  const loadLogs = async () => { const response = await securityService.getLogs(filters); setLogs(response.data || []); };
  const loadArchive = async () => {
    const [archiveResponse, integrationResponse] = await Promise.all([securityService.getArchives(), securityService.getIntegrationStatus()]);
    setArchives(archiveResponse.data || []); setIntegration(integrationResponse);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProfile(), loadUsers(), loadLogs(), loadArchive()])
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  // Initial page load only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active === 'permissions' && (profile.role === 'OWNER' || currentUser?.role === 'OWNER')) { loadPermissions().catch((error) => toast.error(error.message)); loadMemberships().catch((error) => toast.error(error.message)); }
    if (active !== 'logs') return;
    loadLogs().catch((error) => toast.error(error.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, active]);

  const groupedUsers = useMemo(() => users.reduce((groups, user) => {
    const role = user.role || 'UNKNOWN';
    if (!groups[role]) groups[role] = [];
    groups[role].push(user);
    return groups;
  }, {}), [users]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, username: form.username, email: form.email };
      if (form.username !== profile.username) payload.currentPassword = form.currentPassword;
      const response = await securityService.updateMe(payload);
      setProfile(response.data); setForm((current) => ({ ...current, currentPassword: '' }));
      onUserUpdated?.({ ...currentUser, ...response.data });
      toast.success(response.message);
      await loadLogs();
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const response = await securityService.uploadPhoto(file);
      setProfile(response.data); onUserUpdated?.({ ...currentUser, ...response.data }); toast.success(response.message);
    } catch (error) { toast.error(error.message); }
    finally { event.target.value = ''; }
  };
  const removePhoto = async () => {
    try { const response = await securityService.deletePhoto(); setProfile(response.data); onUserUpdated?.({ ...currentUser, ...response.data }); toast.success(response.message); }
    catch (error) { toast.error(error.message); }
  };
  const changePassword = async () => {
    if (password.newPassword !== password.confirmPassword) return toast.error('Konfirmasi password tidak sama.');
    try {
      const response = await securityService.updatePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success(response.message);
    } catch (error) { toast.error(error.message); }
  };

  const tabContent = {
    profile: (
      <section className="setting-card">
        <div className="setting-section-title"><div><span>AKUN SENDIRI</span><h2>Profile Saya</h2><p>Ubah identitas akun sendiri. Semua perubahan tercatat di Activity Log.</p></div></div>
        <div className="setting-avatar-row">
          {profile.photoUrl ? <img src={securityService.photoUrl(profile.photoUrl)} alt="Foto profil" /> : <div className="setting-avatar-fallback">{initials(profile.name)}</div>}
          <div><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} /><div className="setting-inline"><button className="setting-btn" onClick={() => photoInput.current?.click()}><Camera size={15} /> Ganti Foto</button>{profile.photoUrl && <button className="setting-btn danger" onClick={removePhoto}><Trash2 size={15} /> Hapus</button>}</div><small>JPG, PNG, atau WEBP · maksimal 2 MB</small></div>
        </div>
        <div className="setting-grid">
          <label><span>Nama lengkap</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span>Role</span><input value={profile.role || ''} disabled /></label>
          <label><span>Username</span><input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
          <label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          {form.username !== profile.username && <label className="full"><span>Password lama · wajib jika ganti username</span><input type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></label>}
        </div>
        <div className="setting-save"><span>Nama dan foto tidak membutuhkan OTP. Gmail diaktifkan nanti saat server bersama.</span><button className="setting-btn primary" onClick={saveProfile} disabled={saving}><Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Profile'}</button></div>
      </section>
    ),
    security: (
      <section className="setting-card">
        <div className="setting-section-title"><div><span>KEAMANAN AKUN</span><h2>Password & Login</h2><p>Password tidak pernah disimpan di log. Log hanya mencatat bahwa password berubah.</p></div></div>
        <div className="setting-grid"><label><span>Password lama</span><input type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label><div /><label><span>Password baru</span><input type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /></label><label><span>Konfirmasi password</span><input type="password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} /></label></div>
        <div className="setting-save"><span>Notifikasi Gmail belum aktif pada mode lokal.</span><button className="setting-btn primary" onClick={changePassword}><KeyRound size={15} /> Ganti Password</button></div>
        <div className="setting-security-facts"><div><span>Email</span><strong>{profile.email || 'Belum diisi'}</strong></div><div><span>Login terakhir</span><strong>{dateText(profile.lastLoginAt)}</strong></div><div><span>Akun dibuat</span><strong>{dateText(profile.createdAt)}</strong></div><div><span>Status</span><strong className="ok">Aktif</strong></div></div>
      </section>
    ),
    users: (
      <section className="setting-card"><div className="setting-section-title"><div><span>DIREKTORI READ-ONLY</span><h2>User berdasarkan Role</h2><p>User tidak bisa mengubah akun orang lain.</p></div><strong>{users.length} user</strong></div>
        <div className="setting-role-list">{roleOrder.filter((role) => groupedUsers[role]?.length).map((role) => <div className="setting-role" key={role}><div className="setting-role-head"><strong>{role}</strong><span>{groupedUsers[role].length} user</span></div><div className="setting-table-wrap"><table><thead><tr><th>User</th><th>Username</th><th>Email</th><th>Terakhir Login</th><th>Status</th></tr></thead><tbody>{groupedUsers[role].map((entry) => <tr key={entry.id}><td><div className="setting-user-cell">{entry.photoUrl ? <img src={securityService.photoUrl(entry.photoUrl)} alt="" /> : <i>{initials(entry.name)}</i>}<strong>{entry.name}</strong></div></td><td>{entry.username}</td><td>{entry.email || '-'}</td><td>{dateText(entry.lastLoginAt)}</td><td><span className="setting-status success">Aktif</span></td></tr>)}</tbody></table></div></div>)}</div>
      </section>
    ),
    permissions: (
      <section className="setting-card">
        <div className="setting-section-title"><div><span>KONTROL AKSES</span><h2>Pengaturan Akses</h2><p>Atur hak akses per halaman dan tentukan siapa yang boleh membuka project mana.</p></div></div>
        {profile.role === 'OWNER' || currentUser?.role === 'OWNER' ? (
          <>
            <div className="setting-subnav">
              <button type="button" className={accessTab === 'pages' ? 'active' : ''} onClick={() => setAccessTab('pages')}>Akses Halaman</button>
              <button type="button" className={accessTab === 'members' ? 'active' : ''} onClick={() => setAccessTab('members')}>Anggota Project</button>
            </div>

            {accessTab === 'pages' ? (
              <div className="setting-access-panel">
                <aside className="setting-access-side">
                  <span className="setting-access-label">Role yang diatur</span>
                  {(permissionData?.roles || roleOrder).map((role) => {
                    const count = Object.values(permissionData?.template?.[role] || {}).filter((value) => value !== 'NONE').length;
                    return (
                      <button key={role} type="button" className={`setting-access-item ${permissionRole === role ? 'active' : ''}`} onClick={() => { setPermissionRole(role); setPermissionDraft(permissionData?.template?.[role] || {}); }}>
                        <strong>{role}</strong>
                        <small>{role === 'OWNER' ? 'Akses penuh' : `${count} halaman`}</small>
                      </button>
                    );
                  })}
                </aside>
                <div className="setting-access-body">
                  <div className="setting-access-toolbar">
                    <div><strong>{permissionRole}</strong><small>Hak akses global untuk role ini</small></div>
                    <div className="setting-inline">
                      <button type="button" className="setting-btn" disabled={permissionRole === 'OWNER'} onClick={() => { const next = {}; for (const module of (permissionData?.modules || [])) next[module.key] = 'MANAGE'; setPermissionDraft(next); }}>Pilih semua Kelola</button>
                      <button type="button" className="setting-btn" disabled={permissionRole === 'OWNER'} onClick={() => { const next = {}; for (const module of (permissionData?.modules || [])) next[module.key] = 'NONE'; setPermissionDraft(next); }}>Kosongkan</button>
                    </div>
                  </div>
                  <div className="setting-access-head"><span>Halaman</span><span>Akses</span></div>
                  {(permissionData?.modules || []).map((module) => (
                    <div className="setting-access-row" key={module.key}>
                      <div className="setting-access-meta"><strong>{module.label}</strong><small>{module.hint}</small></div>
                      <select value={permissionDraft[module.key] || 'NONE'} disabled={permissionRole === 'OWNER'} onChange={(event) => setPermissionDraft({ ...permissionDraft, [module.key]: event.target.value })}>
                        <option value="NONE">Tidak ada</option><option value="READ">Lihat</option><option value="MANAGE">Kelola</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="setting-access-panel">
                <aside className="setting-access-side">
                  <span className="setting-access-label">Project</span>
                  <input className="setting-access-search" placeholder="Cari project..." value={memberProjectQuery} onChange={(event) => setMemberProjectQuery(event.target.value)} />
                  <div className="setting-access-scroll">
                    {memberProjects.filter((project) => project.name.toLowerCase().includes(memberProjectQuery.toLowerCase())).map((project) => (
                      <button key={project.id} type="button" className={`setting-access-item ${memberProjectId === project.id ? 'active' : ''}`} onClick={() => selectMemberProject(project.id)}>
                        <strong>{project.name}</strong>
                        <small>{memberCounts.get(project.id) || 0} anggota</small>
                      </button>
                    ))}
                    {!memberProjects.length && <div className="setting-access-empty">Belum ada project.</div>}
                  </div>
                </aside>
                <div className="setting-access-body">
                  <div className="setting-access-toolbar">
                    <div><strong>{memberProjects.find((project) => project.id === memberProjectId)?.name || 'Pilih project'}</strong><small>{memberDraft.size} user dipilih</small></div>
                    <div className="setting-inline">
                      <input className="setting-access-search" placeholder="Cari user..." value={memberUserQuery} onChange={(event) => setMemberUserQuery(event.target.value)} />
                      <button type="button" className="setting-btn" disabled={!memberProjectId} onClick={() => setMemberDraft(new Set(users.map((entry) => entry.id)))}>Pilih semua</button>
                      <button type="button" className="setting-btn" disabled={!memberProjectId} onClick={() => setMemberDraft(new Set())}>Kosongkan</button>
                    </div>
                  </div>
                  <div className="setting-access-head"><span>User</span><span>Anggota</span></div>
                  <div className="setting-access-scroll">
                    {users.filter((entry) => `${entry.name} ${entry.username} ${entry.role}`.toLowerCase().includes(memberUserQuery.toLowerCase())).map((entry) => (
                      <label key={entry.id} className={`setting-access-row selectable ${memberDraft.has(entry.id) ? 'checked' : ''}`}>
                        <div className="setting-access-user">
                          <i className="setting-access-avatar">{initials(entry.name)}</i>
                          <div className="setting-access-meta"><strong>{entry.name}</strong><small>{entry.role} · {entry.username}</small></div>
                        </div>
                        <input
                          type="checkbox"
                          className="setting-access-check"
                          checked={memberDraft.has(entry.id)}
                          onChange={() => {
                            const next = new Set(memberDraft);
                            if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id);
                            setMemberDraft(next);
                          }}
                        />
                      </label>
                    ))}
                    {!users.length && <div className="setting-access-empty">Belum ada user.</div>}
                  </div>
                </div>
              </div>
            )}

            <div className="setting-save">
              <span>{accessTab === 'pages' ? 'Owner selalu memiliki akses penuh.' : 'Owner dan Admin selalu melihat semua project.'}</span>
              {accessTab === 'pages' ? (
                <button className="setting-btn primary" disabled={permissionRole === 'OWNER'} onClick={async () => { try { await securityService.updatePermissionTemplate(permissionRole, permissionDraft); toast.success('Template permission disimpan.'); await loadPermissions(); } catch (error) { toast.error(error.message); } }}><Save size={15} /> Simpan Akses</button>
              ) : (
                <button className="setting-btn primary" disabled={!memberProjectId} onClick={async () => {
                  try {
                    await securityService.updateProjectMembership(memberProjectId, [...memberDraft]);
                    toast.success('Anggota project disimpan.');
                    await loadMemberships();
                  } catch (error) { toast.error(error.message); }
                }}><Save size={15} /> Simpan Anggota</button>
              )}
            </div>
          </>
        ) : <div className="setting-empty">Hanya OWNER yang dapat mengatur akses.</div>}
      </section>
    ),
    logs: (
      <section className="setting-card"><div className="setting-section-title"><div><span>AUDIT ANTI-KECURANGAN</span><h2>Activity Log</h2><p>Approval menjadi filter awal. Ditampilkan sebagai aksi bisnis, bukan raw HTTP.</p></div><button className="setting-btn" onClick={loadLogs}><RefreshCw size={15} /> Muat Ulang</button></div>
        <div className="setting-log-tabs">{['APPROVAL', ...modules.filter((item) => item !== 'APPROVAL'), ''].map((module) => <button key={module || 'ALL'} className={filters.module === module ? 'active' : ''} onClick={() => setFilters({ ...filters, module })}>{module || 'SEMUA'}</button>)}</div>
        <div className="setting-filters"><select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}><option value="">Semua role</option>{roleOrder.map((role) => <option key={role}>{role}</option>)}</select><select value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value })}><option value="">Semua user</option>{users.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Semua status</option><option>SUCCESS</option><option>FAILED</option></select><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></div>
        <div className="setting-log-list">{logs.map((log) => <article key={log.id} className={`setting-log ${log.status === 'FAILED' ? 'failed' : ''}`}><i /><time>{dateText(log.createdAt)}</time><div><strong>{log.userName || 'Sistem'}</strong><small>{log.role || '-'}</small></div><div><strong>{log.summary}</strong><small>{log.projectName || log.entityName || log.module}</small>{log.changes && Object.keys(log.changes).length > 0 && <code>{JSON.stringify(log.changes)}</code>}</div><span className={`setting-status ${log.status === 'FAILED' ? 'failed' : 'success'}`}>{log.status}</span></article>)}{!logs.length && <div className="setting-empty">Belum ada log yang cocok dengan filter.</div>}</div>
        <div className="setting-save"><span>{logs.length} aktivitas ditampilkan</span><div className="setting-inline"><button className="setting-btn" onClick={() => securityService.downloadLogs('txt')}><Download size={15} /> TXT</button><button className="setting-btn" onClick={() => securityService.downloadLogs('xlsx')}><Download size={15} /> Excel</button></div></div>
      </section>
    ),
    archive: (
      <section className="setting-card"><div className="setting-section-title"><div><span>RETENSI & INTEGRASI</span><h2>Archive</h2><p>Database menyimpan 3 bulan. Log lama baru dihapus setelah arsip terverifikasi.</p></div></div>
        <div className="setting-archive-grid">{archives.map((entry) => <div className="setting-archive" key={entry.month}><span className="setting-status success">{entry.status}</span><h3>{entry.month}</h3><p>{entry.recordCount.toLocaleString('id-ID')} aktivitas · {(entry.byteSize / 1024).toFixed(1)} KB</p><code>SHA256 {entry.sha256.slice(0, 18)}…</code><div className="setting-inline"><button className="setting-btn" onClick={() => securityService.downloadArchive(entry.month, 'txt')}>TXT</button><button className="setting-btn" onClick={() => securityService.downloadArchive(entry.month, 'xlsx')}>Excel</button></div></div>)}{!archives.length && <div className="setting-empty">Belum ada arsip. Arsip dibuat saat log lebih tua dari 3 bulan.</div>}</div>
        <div className="setting-gmail"><div><strong>Integrasi Gmail</strong><span>{integration?.gmailEnabled ? 'Aktif' : 'Ditunda selama aplikasi masih lokal'}</span></div><span className={`setting-status ${integration?.gmailEnabled ? 'success' : 'warning'}`}>{integration?.gmailEnabled ? 'AKTIF' : 'DITUNDA'}</span></div>
        <div className="setting-security-facts"><div><span>Masa OTP</span><strong>{integration?.otpTtlMinutes || 10} menit</strong></div><div><span>Maks. percobaan</span><strong>{integration?.maxOtpAttempts || 5} kali</strong></div><div><span>Login mencurigakan</span><strong>{integration?.suspiciousLogin?.failedAttempts || 5} gagal / {integration?.suspiciousLogin?.windowMinutes || 15} menit</strong></div><div><span>Retensi aktif</span><strong>{integration?.retentionMonths || 3} bulan</strong></div></div>
      </section>
    ),
  };

  return <div className="settings-page"><header className="settings-header"><div><span>ADMINISTRASI / AKUN & AUDIT</span><h1>Setting</h1><p>Kelola profile, keamanan akun, direktori user, dan jejak aktivitas sistem.</p></div>{loading && <RefreshCw className="setting-spin" size={20} />}</header><div className="setting-testing"><strong>MODE TESTING</strong><span>Semua role dapat mengakses. Setelah revisi selesai, akses Security dapat dikunci melalui konfigurasi server.</span></div><nav className="setting-tabs">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}><Icon size={16} /> {label}</button>)}</nav>{tabContent[active]}</div>;
}
