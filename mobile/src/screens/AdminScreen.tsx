import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, Alert, FlatList, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getAdminStats, getAdminUsers, getAdminUser,
  getAdminReservations, getAdminReviews, getAdminDogs,
  toggleUserActive, toggleWalkerFeatured, deleteUser,
  AdminStats, AdminUser, AdminUserDetail, AdminReservation, AdminReview, AdminDog,
} from '../api/admin'
import { imgUrl } from '../api/config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GREEN = '#00BF8F'
const roleLabel: Record<string, string> = { owner: 'Vlasnik', walker: 'Šetač', admin: 'Admin' }
const roleBadgeColor: Record<string, { bg: string; text: string }> = {
  owner: { bg: '#dbeafe', text: '#1d4ed8' },
  walker: { bg: '#dcfce7', text: '#15803d' },
  admin: { bg: '#ede9fe', text: '#7c3aed' },
}
const statusColor: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#a16207' },
  confirmed: { bg: '#dbeafe', text: '#1d4ed8' },
  completed: { bg: '#dcfce7', text: '#15803d' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
  rejected: { bg: '#f3f4f6', text: '#6b7280' },
}
const statusLabel: Record<string, string> = {
  pending: 'Na čekanju', confirmed: 'Potvrđeno', completed: 'Završeno',
  cancelled: 'Otkazano', rejected: 'Odbijeno',
}
const sizeLabel: Record<string, string> = { small: 'Mali', medium: 'Srednji', large: 'Veliki' }
const genderLabel: Record<string, string> = { male: 'Mužjak', female: 'Ženka' }

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type Tab = 'dashboard' | 'users' | 'reservations' | 'reviews' | 'dogs'

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, onPress }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.statCard}
    >
      <Ionicons name={icon} size={20} color="#00BF8F" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#6d28d9', '#2563eb', '#059669', '#dc2626', '#d97706']

function Avatar({ firstName, lastName, profileImage, id, size = 40 }: {
  firstName: string; lastName: string; profileImage: string | null; id: number; size?: number
}) {
  const photo = imgUrl(profileImage)
  const color = AVATAR_COLORS[id % AVATAR_COLORS.length]
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>
        {firstName[0]}{lastName[0]}
      </Text>
    </View>
  )
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: user, isLoading } = useQuery<AdminUserDetail>({
    queryKey: ['admin-user', userId],
    queryFn: () => getAdminUser(userId),
  })

  const toggleMut = useMutation({
    mutationFn: (active: boolean) => toggleUserActive(userId, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', userId] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const featuredMut = useMutation({
    mutationFn: (featured: boolean) => toggleWalkerFeatured(userId, featured),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', userId] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      onClose()
    },
  })

  function handleDelete() {
    Alert.alert(
      'Obriši korisnika',
      'Da li ste sigurni? Ova akcija je nepovratna.',
      [
        { text: 'Otkaži', style: 'cancel', onPress: () => setConfirmDelete(false) },
        { text: 'Da, obriši', style: 'destructive', onPress: () => deleteMut.mutate() },
      ]
    )
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Detalji korisnika</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={14} color="#374151" />
          </TouchableOpacity>
        </View>

        {isLoading || !user ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* User header */}
            <View style={styles.userHeader}>
              <Avatar firstName={user.first_name} lastName={user.last_name} profileImage={user.profile_image} id={user.id} size={56} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: roleBadgeColor[user.role]?.bg }]}>
                    <Text style={[styles.badgeText, { color: roleBadgeColor[user.role]?.text }]}>{roleLabel[user.role]}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.badgeText, { color: user.is_active ? '#15803d' : '#dc2626' }]}>
                      {user.is_active ? 'Aktivan' : 'Neaktivan'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Telefon</Text>
                <Text style={styles.infoValue}>{user.phone || '—'}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Registrovan</Text>
                <Text style={styles.infoValue}>{fmtDate(user.created_at)}</Text>
              </View>
              <View style={[styles.infoCell, { flex: 1 }]}>
                <Text style={styles.infoLabel}>Adresa</Text>
                <Text style={styles.infoValue}>{user.address || '—'}</Text>
              </View>
            </View>

            {/* Walker profile */}
            {user.walker_profile && (
              <View style={styles.walkerBox}>
                <Text style={styles.walkerBoxTitle}>Šetač profil</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoCell}>
                    <Text style={[styles.infoLabel, { color: '#15803d' }]}>Usluge</Text>
                    <Text style={styles.infoValue}>
                      {user.walker_profile.services === 'both' ? 'Sve' : user.walker_profile.services === 'walking' ? 'Šetanje' : 'Čuvanje'}
                    </Text>
                  </View>
                  <View style={styles.infoCell}>
                    <Text style={[styles.infoLabel, { color: '#15803d' }]}>Cena/sat</Text>
                    <Text style={styles.infoValue}>{user.walker_profile.hourly_rate} RSD</Text>
                  </View>
                  {user.walker_profile.daily_rate && (
                    <View style={styles.infoCell}>
                      <Text style={[styles.infoLabel, { color: '#15803d' }]}>Cena/dan</Text>
                      <Text style={styles.infoValue}>{user.walker_profile.daily_rate} RSD</Text>
                    </View>
                  )}
                  <View style={styles.infoCell}>
                    <Text style={[styles.infoLabel, { color: '#15803d' }]}>Ocena</Text>
                    <Text style={styles.infoValue}>
                      {user.walker_profile.average_rating} ({user.walker_profile.review_count})
                    </Text>
                  </View>
                </View>
                {user.walker_profile.bio ? (
                  <Text style={{ fontSize: 13, color: '#166534', marginTop: 8 }}>{user.walker_profile.bio}</Text>
                ) : null}
              </View>
            )}

            {/* Reservation stats */}
            <Text style={styles.sectionTitle}>Statistika rezervacija</Text>
            <View style={styles.statsRow}>
              {[
                { label: 'Ukupno', value: user.stats.total_reservations },
                { label: 'Završeno', value: user.stats.completed },
                { label: 'Otkazano', value: user.stats.cancelled },
                { label: 'Na ček.', value: user.stats.pending },
              ].map(s => (
                <View key={s.label} style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{s.value}</Text>
                  <Text style={styles.miniStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Dogs */}
            {user.dogs.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Psi ({user.dogs.length})</Text>
                {user.dogs.map(d => (
                  <View key={d.id} style={styles.dogRow}>
                    {imgUrl(d.image) ? (
                      <Image source={{ uri: imgUrl(d.image)! }} style={styles.dogThumb} />
                    ) : (
                      <View style={[styles.dogThumb, { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="paw-outline" size={18} color="#9ca3af" />
                      </View>
                    )}
                    <View>
                      <Text style={styles.dogName}>{d.name}</Text>
                      <Text style={styles.dogMeta}>{d.breed} · {d.age} god. · {sizeLabel[d.size] || d.size}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Recent reservations */}
            {user.recent_reservations.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Poslednje rezervacije</Text>
                {user.recent_reservations.map(r => {
                  const sc = statusColor[r.status] || statusColor.rejected
                  return (
                    <View key={r.id} style={styles.resRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resUser}>{r.other_user}</Text>
                        <Text style={styles.resMeta}>{fmtDateTime(r.start_time)} · {r.service_type === 'walking' ? 'Šetanje' : 'Čuvanje'}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]}>{statusLabel[r.status]}</Text>
                      </View>
                    </View>
                  )
                })}
              </>
            )}

            {/* Actions */}
            {user.role !== 'admin' && (
              <View style={styles.actionsBox}>
                <TouchableOpacity
                  onPress={() => toggleMut.mutate(!user.is_active)}
                  disabled={toggleMut.isPending}
                  style={[styles.actionBtn, { backgroundColor: user.is_active ? '#fef9c3' : '#dcfce7' }]}
                >
                  <Text style={[styles.actionBtnText, { color: user.is_active ? '#a16207' : '#15803d' }]}>
                    {toggleMut.isPending ? 'Čekanje...' : user.is_active ? 'Deaktiviraj korisnika' : 'Aktiviraj korisnika'}
                  </Text>
                </TouchableOpacity>

                {user.role === 'walker' && (
                  <TouchableOpacity
                    onPress={() => featuredMut.mutate(!user.walker_profile?.is_featured)}
                    disabled={featuredMut.isPending}
                    style={[styles.actionBtn, {
                      backgroundColor: user.walker_profile?.is_featured ? '#f0fdf4' : GREEN,
                      borderWidth: user.walker_profile?.is_featured ? 1 : 0,
                      borderColor: '#bbf7d0',
                    }]}
                  >
                    <Text style={[styles.actionBtnText, { color: user.walker_profile?.is_featured ? '#166534' : '#fff' }]}>
                      {featuredMut.isPending ? 'Čekanje...' : user.walker_profile?.is_featured ? 'Ukloni istaknutog' : 'Označi kao istaknutog'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={deleteMut.isPending}
                  style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}
                >
                  <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>
                    {deleteMut.isPending ? 'Brisanje...' : 'Obriši korisnika'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ stats, onNavigate }: { stats: AdminStats; onNavigate: (tab: Tab) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.tabSectionTitle}>Korisnici</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Ukupno" value={stats.total_users} icon="people-outline" onPress={() => onNavigate('users')} />
        <StatCard label="Vlasnici" value={stats.owners} icon="person-outline" onPress={() => onNavigate('users')} />
        <StatCard label="Šetači" value={stats.walkers} icon="footsteps-outline" onPress={() => onNavigate('users')} />
        <StatCard label="Admini" value={stats.admins} icon="shield-checkmark-outline" />
      </View>

      <Text style={styles.tabSectionTitle}>Rezervacije</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Ukupno" value={stats.total_reservations} icon="calendar-outline" onPress={() => onNavigate('reservations')} />
        <StatCard label="Završene" value={stats.completed_reservations} icon="checkmark-done-outline" onPress={() => onNavigate('reservations')} />
        <StatCard label="Na čekanju" value={stats.pending_reservations} icon="time-outline" onPress={() => onNavigate('reservations')} />
        <StatCard label="Otkazane" value={stats.cancelled_reservations} icon="close-circle-outline" onPress={() => onNavigate('reservations')} />
      </View>

      <Text style={styles.tabSectionTitle}>Ostalo</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Recenzije" value={stats.total_reviews} icon="star-outline" onPress={() => onNavigate('reviews')} />
        <StatCard label="Psi" value={stats.total_dogs} icon="paw-outline" onPress={() => onNavigate('dogs')} />
        <StatCard label="Aktivni" value={stats.active_users} icon="checkmark-circle-outline" onPress={() => onNavigate('users')} />
        <StatCard label="Neaktivni" value={stats.inactive_users} icon="alert-circle-outline" onPress={() => onNavigate('users')} />
      </View>
    </ScrollView>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)

  const params: Record<string, string> = { page: String(page) }
  if (search) params.search = search
  if (role) params.role = role

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => getAdminUsers(params),
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <View style={{ flex: 1 }}>
      {selectedUser !== null && (
        <UserDetailModal userId={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pretraži..."
          value={search}
          onChangeText={v => { setSearch(v); setPage(1) }}
          placeholderTextColor="#9ca3af"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilters}>
          {['', 'owner', 'walker', 'admin'].map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => { setRole(r); setPage(1) }}
              style={[styles.filterChip, role === r && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, role === r && styles.filterChipTextActive]}>
                {r === '' ? 'Svi' : roleLabel[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <FlatList
          data={data?.results}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedUser(item.id)} style={styles.userRow}>
              <Avatar firstName={item.first_name} lastName={item.last_name} profileImage={item.profile_image} id={item.id} size={40} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.userRowName}>{item.first_name} {item.last_name}</Text>
                <Text style={styles.userRowEmail} numberOfLines={1}>{item.email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[styles.badge, { backgroundColor: roleBadgeColor[item.role]?.bg }]}>
                  <Text style={[styles.badgeText, { color: roleBadgeColor[item.role]?.text }]}>{roleLabel[item.role]}</Text>
                </View>
                {!item.is_active && (
                  <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.badgeText, { color: '#dc2626' }]}>Neaktivan</Text>
                  </View>
                )}
                {item.walker_profile?.is_featured && (
                  <Text style={{ fontSize: 11, color: GREEN, fontWeight: '700' }}>Istaknut</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {totalPages}  ({data?.count} ukupno)</Text>
              <TouchableOpacity
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </View>
  )
}

// ─── Reservations Tab ─────────────────────────────────────────────────────────

function ReservationsTab() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const params: Record<string, string> = { page: String(page) }
  if (status) params.status = status

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reservations', params],
    queryFn: () => getAdminReservations(params),
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBarHorizontal}>
        {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => { setStatus(s); setPage(1) }}
            style={[styles.filterChip, status === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, status === s && styles.filterChipTextActive]}>
              {s === '' ? 'Sve' : statusLabel[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <FlatList
          data={data?.results}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => {
            const sc = statusColor[item.status] || statusColor.rejected
            return (
              <View style={styles.listCard}>
                <View style={styles.listCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardTitle}>#{item.id} · {item.service_type === 'walking' ? 'Šetanje' : 'Čuvanje'}</Text>
                    <Text style={styles.listCardMeta}>{item.owner_name} → {item.walker_name}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{statusLabel[item.status]}</Text>
                  </View>
                </View>
                <Text style={styles.listCardDate}>{fmtDateTime(item.start_time)}</Text>
              </View>
            )
          }}
          ListFooterComponent={totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}>
                <Text style={styles.pageBtnText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}>
                <Text style={styles.pageBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </View>
  )
}

// ─── Reviews Tab ──────────────────────────────────────────────────────────────

function ReviewsTab() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page],
    queryFn: () => getAdminReviews({ page: String(page) }),
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <FlatList
          data={data?.results}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View style={styles.listCard}>
              <View style={styles.listCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listCardTitle}>{item.owner_name} → {item.walker_name}</Text>
                  <Text style={styles.listCardMeta}>{item.comment || '—'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color="#FAAB43" />
                  ))}
                </View>
              </View>
              <Text style={styles.listCardDate}>{fmtDate(item.created_at)}</Text>
            </View>
          )}
          ListFooterComponent={totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}>
                <Text style={styles.pageBtnText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}>
                <Text style={styles.pageBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </View>
  )
}

// ─── Dogs Tab ─────────────────────────────────────────────────────────────────

function DogsTab() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dogs', page],
    queryFn: () => getAdminDogs({ page: String(page) }),
  })

  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <FlatList
          data={data?.results}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View style={styles.listCard}>
              <View style={styles.listCardTop}>
                {imgUrl(item.image) ? (
                  <Image source={{ uri: imgUrl(item.image)! }} style={styles.dogThumb} />
                ) : (
                  <View style={[styles.dogThumb, { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="paw-outline" size={18} color="#9ca3af" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.listCardTitle}>{item.name}</Text>
                  <Text style={styles.listCardMeta}>{item.breed} · {item.age} god. · {sizeLabel[item.size] || item.size} · {genderLabel[item.gender] || item.gender}</Text>
                  <Text style={styles.listCardDate}>Vlasnik: {item.owner_name}</Text>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}>
                <Text style={styles.pageBtnText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}>
                <Text style={styles.pageBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </View>
  )
}

// ─── Main AdminScreen ─────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dashboard', label: 'Pregled', icon: 'stats-chart-outline' },
  { key: 'users', label: 'Korisnici', icon: 'people-outline' },
  { key: 'reservations', label: 'Rezervacije', icon: 'calendar-outline' },
  { key: 'reviews', label: 'Recenzije', icon: 'star-outline' },
  { key: 'dogs', label: 'Psi', icon: 'paw-outline' },
]

export default function AdminScreen() {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  })

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Admin panel</Text>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tabBarItem, activeTab === t.key && styles.tabBarItemActive]}
          >
            <Ionicons name={t.icon} size={16} color={activeTab === t.key ? '#00BF8F' : '#6b7280'} />
            <Text style={[styles.tabBarLabel, activeTab === t.key && styles.tabBarLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {statsLoading && activeTab === 'dashboard' ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
        ) : activeTab === 'dashboard' && stats ? (
          <DashboardTab stats={stats} onNavigate={setActiveTab} />
        ) : activeTab === 'users' ? (
          <UsersTab />
        ) : activeTab === 'reservations' ? (
          <ReservationsTab />
        ) : activeTab === 'reviews' ? (
          <ReviewsTab />
        ) : activeTab === 'dogs' ? (
          <DogsTab />
        ) : null}
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 52,
  },
  tabBarContent: {
    paddingHorizontal: 8,
    gap: 4,
  },
  tabBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 6,
    gap: 4,
  },
  tabBarItemActive: {
    backgroundColor: '#f0fdf4',
  },
  tabBarIcon: {
    fontSize: 14,
  },
  tabBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabBarLabelActive: {
    color: GREEN,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    padding: 12,
    paddingBottom: 24,
  },
  tabSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  filterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterBarHorizontal: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 52,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  roleFilters: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 6,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  userRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  userRowEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '700',
  },
  pageInfo: {
    fontSize: 13,
    color: '#6b7280',
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  listCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  listCardMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  listCardDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '700',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  infoCell: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    minWidth: '47%',
  },
  infoLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  walkerBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  walkerBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  miniStat: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  miniStatLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  dogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  dogThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  dogName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  dogMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  resUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  resMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  actionsBox: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
})
