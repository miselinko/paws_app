import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { imgUrl } from '../config'
import {
  getAdminStats,
  getAdminUsers,
  getAdminUser,
  getAdminReservations,
  getAdminReviews,
  getAdminDogs,
  toggleUserActive,
  toggleWalkerFeatured,
  deleteUser,
  type AdminStats,
  type AdminUser,
  type AdminUserDetail,
  type AdminReservation,
  type AdminReview,
  type AdminDog,
} from '../api/admin'

/* ─── helpers ─────────────────────────────────────────────────────── */

const roleLabel: Record<string, string> = { owner: 'Vlasnik', walker: 'Šetač', admin: 'Admin' }
const roleBadge: Record<string, string> = {
  owner: 'bg-blue-100 text-blue-700',
  walker: 'bg-green-100 text-green-700',
  admin: 'bg-purple-100 text-purple-700',
}
const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-gray-100 text-gray-600',
}
const statusLabel: Record<string, string> = {
  pending: 'Na čekanju',
  confirmed: 'Potvrđeno',
  completed: 'Završeno',
  cancelled: 'Otkazano',
  rejected: 'Odbijeno',
}
const sizeLabel: Record<string, string> = { small: 'Mali', medium: 'Srednji', large: 'Veliki' }
const genderLabel: Record<string, string> = { male: 'Mužjak', female: 'Ženka' }
const fmtDate = (s: string) => new Date(s).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateTime = (s: string) => new Date(s).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

type Tab = 'dashboard' | 'users' | 'reservations' | 'reviews' | 'dogs'
type Filters = { role?: string; is_active?: string; status?: string; rating?: string; size?: string }

/* ─── stat card (clickable) ───────────────────────────────────────── */

function StatCard({ label, value, icon, color, onClick }: { label: string; value: number; icon: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 transition-all ${onClick ? 'cursor-pointer hover:border-[#00BF8F] hover:shadow-md hover:-translate-y-0.5' : ''}`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      {onClick && (
        <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )
}

/* ─── pagination ──────────────────────────────────────────────────── */

function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">{total} ukupno</p>
      <div className="flex gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">←</button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page + i - 2
          if (p < 1 || p > totalPages) return null
          return <button key={p} onClick={() => onPage(p)} className={`px-3 py-1.5 text-sm rounded-lg border ${p === page ? 'border-[#00BF8F] bg-[#00BF8F] text-white' : 'border-gray-200 hover:bg-gray-50'}`}>{p}</button>
        })}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">→</button>
      </div>
    </div>
  )
}

/* ─── spinner ─────────────────────────────────────────────────────── */

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-gray-200 border-t-[#00BF8F] rounded-full animate-spin" /></div>
}

/* ─── dashboard ───────────────────────────────────────────────────── */

function Dashboard({ stats, onNavigate }: { stats: AdminStats; onNavigate: (tab: Tab, filters?: Filters) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Pregled</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ukupno korisnika" value={stats.total_users} icon="👥" color="bg-indigo-50" onClick={() => onNavigate('users')} />
        <StatCard label="Vlasnici" value={stats.owners} icon="🏠" color="bg-blue-50" onClick={() => onNavigate('users', { role: 'owner' })} />
        <StatCard label="Šetači" value={stats.walkers} icon="🐾" color="bg-green-50" onClick={() => onNavigate('users', { role: 'walker' })} />
        <StatCard label="Admini" value={stats.admins} icon="🛡️" color="bg-purple-50" onClick={() => onNavigate('users', { role: 'admin' })} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ukupno rezervacija" value={stats.total_reservations} icon="📅" color="bg-orange-50" onClick={() => onNavigate('reservations')} />
        <StatCard label="Završene" value={stats.completed_reservations} icon="✅" color="bg-emerald-50" onClick={() => onNavigate('reservations', { status: 'completed' })} />
        <StatCard label="Na čekanju" value={stats.pending_reservations} icon="⏳" color="bg-yellow-50" onClick={() => onNavigate('reservations', { status: 'pending' })} />
        <StatCard label="Otkazane" value={stats.cancelled_reservations} icon="❌" color="bg-red-50" onClick={() => onNavigate('reservations', { status: 'cancelled' })} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recenzije" value={stats.total_reviews} icon="⭐" color="bg-amber-50" onClick={() => onNavigate('reviews')} />
        <StatCard label="Psi" value={stats.total_dogs} icon="🐕" color="bg-cyan-50" onClick={() => onNavigate('dogs')} />
        <StatCard label="Aktivni korisnici" value={stats.active_users} icon="🟢" color="bg-lime-50" onClick={() => onNavigate('users', { is_active: 'true' })} />
        <StatCard label="Neaktivni" value={stats.inactive_users} icon="🔴" color="bg-stone-50" onClick={() => onNavigate('users', { is_active: 'false' })} />
      </div>
    </div>
  )
}

/* ─── user detail panel ───────────────────────────────────────────── */

function UserDetail({ userId, onClose }: { userId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: user, isLoading } = useQuery<AdminUserDetail>({
    queryKey: ['admin-user', userId],
    queryFn: () => getAdminUser(userId),
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleMut = useMutation({
    mutationFn: (active: boolean) => toggleUserActive(userId, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', userId] })
      qc.refetchQueries({ queryKey: ['admin-users'] })
      qc.refetchQueries({ queryKey: ['admin-stats'] })
    },
  })
  const featuredMut = useMutation({
    mutationFn: (featured: boolean) => toggleWalkerFeatured(userId, featured),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', userId] })
      qc.refetchQueries({ queryKey: ['admin-users'] })
    },
  })
  const deleteMut = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); onClose() },
  })

  if (isLoading || !user) return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 flex items-center justify-center"><Spinner /></div>
    </>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 overflow-y-auto" style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {user.profile_image ? (
                <img src={imgUrl(user.profile_image)} className="w-16 h-16 rounded-2xl object-cover" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-lg font-bold" style={{ background: 'linear-gradient(135deg, #00BF8F, #00A87D)' }}>
                  {user.first_name[0]}{user.last_name[0]}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${roleBadge[user.role]}`}>{roleLabel[user.role]}</span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Aktivan' : 'Neaktivan'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Telefon</p>
              <p className="text-sm font-medium text-gray-900">{user.phone || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Registrovan</p>
              <p className="text-sm font-medium text-gray-900">{fmtDate(user.created_at)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 col-span-2">
              <p className="text-xs text-gray-500 mb-1">Adresa</p>
              <p className="text-sm font-medium text-gray-900">{user.address || '—'}</p>
            </div>
          </div>

          {/* Walker info */}
          {user.walker_profile && (
            <div className="bg-green-50 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-green-800">Šetač profil</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-green-600">Usluge:</span> <span className="font-medium">{user.walker_profile.services === 'both' ? 'Sve' : user.walker_profile.services === 'walking' ? 'Šetanje' : 'Čuvanje'}</span></div>
                <div><span className="text-green-600">Cena/sat:</span> <span className="font-medium">{user.walker_profile.hourly_rate} RSD</span></div>
                {user.walker_profile.daily_rate && <div><span className="text-green-600">Cena/dan:</span> <span className="font-medium">{user.walker_profile.daily_rate} RSD</span></div>}
                <div><span className="text-green-600">Ocena:</span> <span className="font-medium">{user.walker_profile.average_rating} ({user.walker_profile.review_count})</span></div>
              </div>
              {user.walker_profile.bio && <p className="text-sm text-green-700 mt-2">{user.walker_profile.bio}</p>}
            </div>
          )}

          {/* Stats */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3">Statistika rezervacija</h4>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Ukupno', value: user.stats.total_reservations, color: 'bg-gray-50' },
                { label: 'Završeno', value: user.stats.completed, color: 'bg-green-50' },
                { label: 'Otkazano', value: user.stats.cancelled, color: 'bg-red-50' },
                { label: 'Na ček.', value: user.stats.pending, color: 'bg-yellow-50' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dogs */}
          {user.dogs.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-3">Psi ({user.dogs.length})</h4>
              <div className="space-y-2">
                {user.dogs.map(d => (
                  <div key={d.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    {d.image ? (
                      <img src={imgUrl(d.image)} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-lg">🐕</div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.breed} · {d.age} god. · {sizeLabel[d.size] || d.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent reservations */}
          {user.recent_reservations.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-3">Poslednje rezervacije</h4>
              <div className="space-y-2">
                {user.recent_reservations.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.other_user}</p>
                      <p className="text-xs text-gray-500">{fmtDateTime(r.start_time)} · {r.service_type === 'walking' ? 'Šetanje' : 'Čuvanje'}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {user.role !== 'admin' && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <button
                onClick={() => toggleMut.mutate(!user.is_active)}
                disabled={toggleMut.isPending}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${user.is_active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
              >
                {user.is_active ? 'Deaktiviraj korisnika' : 'Aktiviraj korisnika'}
              </button>
              {user.role === 'walker' && (
                <button
                  onClick={() => featuredMut.mutate(!user.walker_profile?.is_featured)}
                  disabled={featuredMut.isPending}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={user.walker_profile?.is_featured
                    ? { background: '#f0fdf4', color: '#32745c', border: '1px solid #bbf7d0' }
                    : { background: '#32745c', color: '#fff' }}
                >
                  {user.walker_profile?.is_featured ? '✓ Ukloni istaknutog' : '✓ Označi kao istaknutog'}
                </button>
              )}
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  Obriši korisnika
                </button>
              ) : (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-700 mb-3">Da li ste sigurni? Ova akcija je nepovratna.</p>
                  <div className="flex gap-2">
                    <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="flex-1 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700">
                      {deleteMut.isPending ? 'Brisanje...' : 'Da, obriši'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
                      Otkaži
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ─── users table ─────────────────────────────────────────────────── */

function UsersTable({ initialRole, initialActive }: { initialRole?: string; initialActive?: string }) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState(initialRole || '')
  const [activeFilter, setActiveFilter] = useState(initialActive || '')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)

  const params: Record<string, string> = { page: String(page) }
  if (search) params.search = search
  if (role) params.role = role
  if (activeFilter) params.is_active = activeFilter

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => getAdminUsers(params),
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Korisnici</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Pretraži po imenu ili emailu..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30 focus:border-[#00BF8F]" />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30">
          <option value="">Svi tipovi</option>
          <option value="owner">Vlasnici</option>
          <option value="walker">Šetači</option>
          <option value="admin">Admini</option>
        </select>
        <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30">
          <option value="">Svi statusi</option>
          <option value="true">Aktivni</option>
          <option value="false">Neaktivni</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {isLoading ? <Spinner /> : !data?.results.length ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🔍</p><p className="text-sm">Nema pronađenih korisnika</p></div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Korisnik</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tip</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registrovan</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Rez.</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Psi</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.results.map((u: AdminUser) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => setSelectedUser(u.id)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {u.profile_image ? (
                            <img src={imgUrl(u.profile_image)} className="w-9 h-9 rounded-xl object-cover" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #00BF8F, #00A87D)' }}>
                              {u.first_name[0]}{u.last_name[0]}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge[u.role]}`}>{roleLabel[u.role]}</span></td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                          {u.is_active ? 'Aktivan' : 'Neaktivan'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{fmtDate(u.created_at)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 text-center">{u.reservations_count}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 text-center">{u.dogs_count}</td>
                      <td className="px-5 py-3.5 text-right">
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-50">
              {data.results.map((u: AdminUser) => (
                <div key={u.id} className="p-4 hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedUser(u.id)}>
                  <div className="flex items-center gap-3">
                    {u.profile_image ? (
                      <img src={imgUrl(u.profile_image)} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #00BF8F, #00A87D)' }}>
                        {u.first_name[0]}{u.last_name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge[u.role]}`}>{roleLabel[u.role]}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={data?.count ?? 0} onPage={setPage} />
      {selectedUser && <UserDetail userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  )
}

/* ─── reservations table ──────────────────────────────────────────── */

function ReservationsTable({ initialStatus }: { initialStatus?: string }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(initialStatus || '')
  const [service, setService] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)

  const params: Record<string, string> = { page: String(page) }
  if (search) params.search = search
  if (status) params.status = status
  if (service) params.service_type = service

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reservations', params],
    queryFn: () => getAdminReservations(params),
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Rezervacije</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Pretraži po imenu vlasnika ili šetača..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30 focus:border-[#00BF8F]" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30">
          <option value="">Svi statusi</option>
          <option value="pending">Na čekanju</option>
          <option value="confirmed">Potvrđeno</option>
          <option value="completed">Završeno</option>
          <option value="cancelled">Otkazano</option>
          <option value="rejected">Odbijeno</option>
        </select>
        <select value={service} onChange={e => { setService(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30">
          <option value="">Sve usluge</option>
          <option value="walking">Šetanje</option>
          <option value="boarding">Čuvanje</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {isLoading ? <Spinner /> : !data?.results.length ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">📅</p><p className="text-sm">Nema pronađenih rezervacija</p></div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vlasnik</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Šetač</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usluga</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Termin</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.results.map((r: AdminReservation) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">#{r.id}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setSelectedUser(r.owner_id)} className="text-sm font-medium text-[#00BF8F] hover:underline">{r.owner_name}</button>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setSelectedUser(r.walker_id)} className="text-sm font-medium text-[#00BF8F] hover:underline">{r.walker_name}</button>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{r.service_type === 'walking' ? 'Šetanje' : 'Čuvanje'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{fmtDateTime(r.start_time)}</td>
                      <td className="px-5 py-3.5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[r.status]}`}>{statusLabel[r.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-50">
              {data.results.map((r: AdminReservation) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">#{r.id}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[r.status]}`}>{statusLabel[r.status]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => setSelectedUser(r.owner_id)} className="font-medium text-[#00BF8F] hover:underline">{r.owner_name}</button>
                    <span className="text-gray-400">→</span>
                    <button onClick={() => setSelectedUser(r.walker_id)} className="font-medium text-[#00BF8F] hover:underline">{r.walker_name}</button>
                  </div>
                  <p className="text-xs text-gray-500">{fmtDateTime(r.start_time)} · {r.service_type === 'walking' ? 'Šetanje' : 'Čuvanje'}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={data?.count ?? 0} onPage={setPage} />
      {selectedUser && <UserDetail userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  )
}

/* ─── reviews table ───────────────────────────────────────────────── */

function ReviewsTable({ initialRating }: { initialRating?: string }) {
  const [search, setSearch] = useState('')
  const [rating, setRating] = useState(initialRating || '')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)

  const params: Record<string, string> = { page: String(page) }
  if (search) params.search = search
  if (rating) params.rating = rating

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => getAdminReviews(params),
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Recenzije</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Pretraži po imenu..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30 focus:border-[#00BF8F]" />
        </div>
        <select value={rating} onChange={e => { setRating(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30">
          <option value="">Sve ocene</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={String(n)}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {isLoading ? <Spinner /> : !data?.results.length ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">⭐</p><p className="text-sm">Nema pronađenih recenzija</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.results.map((r: AdminReview) => (
              <div key={r.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => setSelectedUser(r.owner_id)} className="font-medium text-[#00BF8F] hover:underline">{r.owner_name}</button>
                    <span className="text-gray-400">→</span>
                    <button onClick={() => setSelectedUser(r.walker_id)} className="font-medium text-[#00BF8F] hover:underline">{r.walker_name}</button>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`text-sm ${i < r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                <p className="text-xs text-gray-400">{fmtDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={data?.count ?? 0} onPage={setPage} />
      {selectedUser && <UserDetail userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  )
}

/* ─── dogs table ──────────────────────────────────────────────────── */

function DogsTable({ initialSize }: { initialSize?: string }) {
  const [search, setSearch] = useState('')
  const [size, setSize] = useState(initialSize || '')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)

  const params: Record<string, string> = { page: String(page) }
  if (search) params.search = search
  if (size) params.size = size

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dogs', params],
    queryFn: () => getAdminDogs(params),
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Psi</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Pretraži po imenu psa, rasi ili vlasniku..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30 focus:border-[#00BF8F]" />
        </div>
        <select value={size} onChange={e => { setSize(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00BF8F]/30">
          <option value="">Sve veličine</option>
          <option value="small">Mali</option>
          <option value="medium">Srednji</option>
          <option value="large">Veliki</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {isLoading ? <Spinner /> : !data?.results.length ? (
          <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🐕</p><p className="text-sm">Nema pronađenih pasa</p></div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pas</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rasa</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Veličina</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pol</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Starost</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vlasnik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.results.map((d: AdminDog) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {d.image ? (
                            <img src={imgUrl(d.image)} className="w-9 h-9 rounded-lg object-cover" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg">🐕</div>
                          )}
                          <span className="text-sm font-semibold text-gray-900">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{d.breed}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{sizeLabel[d.size] || d.size}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{genderLabel[d.gender] || d.gender}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{d.age} god.</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setSelectedUser(d.owner_id)} className="text-sm font-medium text-[#00BF8F] hover:underline">{d.owner_name}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-50">
              {data.results.map((d: AdminDog) => (
                <div key={d.id} className="p-4 flex items-center gap-3">
                  {d.image ? (
                    <img src={imgUrl(d.image)} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🐕</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.breed} · {sizeLabel[d.size]} · {d.age} god.</p>
                    <button onClick={() => setSelectedUser(d.owner_id)} className="text-xs font-medium text-[#00BF8F] hover:underline">
                      {d.owner_name}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={data?.count ?? 0} onPage={setPage} />
      {selectedUser && <UserDetail userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  )
}

/* ─── main admin page ─────────────────────────────────────────────── */

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [filters, setFilters] = useState<Filters>({})

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  })

  const handleNavigate = (newTab: Tab, newFilters?: Filters) => {
    setTab(newTab)
    setFilters(newFilters || {})
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Pregled', icon: '📊' },
    { key: 'users', label: 'Korisnici', icon: '👥' },
    { key: 'reservations', label: 'Rezervacije', icon: '📅' },
    { key: 'reviews', label: 'Recenzije', icon: '⭐' },
    { key: 'dogs', label: 'Psi', icon: '🐕' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin panel</h1>
          <p className="text-sm text-gray-500 mt-1">Upravljanje korisnicima i pregled statistike</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 w-fit overflow-x-auto" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => handleNavigate(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${tab === t.key ? 'bg-[#00BF8F] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && (
          statsLoading ? <Spinner /> : stats ? <Dashboard stats={stats} onNavigate={handleNavigate} /> : null
        )}
        {tab === 'users' && <UsersTable key={JSON.stringify(filters)} initialRole={filters.role} initialActive={filters.is_active} />}
        {tab === 'reservations' && <ReservationsTable key={JSON.stringify(filters)} initialStatus={filters.status} />}
        {tab === 'reviews' && <ReviewsTable key={JSON.stringify(filters)} initialRating={filters.rating} />}
        {tab === 'dogs' && <DogsTable key={JSON.stringify(filters)} initialSize={filters.size} />}
      </div>
    </div>
  )
}
