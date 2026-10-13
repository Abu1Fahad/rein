import { ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';
import { get } from '../db.js';
import { bus } from '../events.js';
import { setting, getInternal, setInternal, ranks } from '../services/settings.js';
import { rankOf } from '../services/ranks.js';
import { getPlayer, playerName } from '../services/players.js';
import { roundName } from './ui.js';

/**
 * Site-wide activity log in Discord. Every entry of the activity log (Admin → Activity log) is posted
 * to a channel inside the configured category, one channel per kind of activity. Missing channels are
 * created automatically (the bot needs "Manage Channels"); deleting one makes the bot recreate it.
 */
export const LOG_CHANNELS = [
  { key: 'registrations', name: '📥┃registrations', topic: 'New registrations, accepted and rejected players', color: 0x5865f2 },
  { key: 'players', name: '👤┃players', topic: 'Player edits, SR adjustments, resets, deletions', color: 0x4bd38f },
  { key: 'matches', name: '⚔️┃matches', topic: 'Match results, changes and showmatches', color: 0xf46b1d },
  { key: 'tournaments', name: '🏆┃tournaments', topic: 'Tournaments created, edited, seeded, reset or deleted', color: 0xf7c64a },
  { key: 'settings', name: '⚙️┃settings', topic: 'Site settings, ranks & points, texts and images', color: 0x9aa3b5 },
  { key: 'admins', name: '🛡️┃admins', topic: 'Admin logins and admin accounts', color: 0xff6060 },
  { key: 'system', name: '🤖┃system', topic: 'Bot and everything else', color: 0x7f9cff },
];

const ICONS = {
  'registration.submit': '📝', 'registration.update': '✏️', 'player.approve': '✅', 'player.reject': '⛔',
  'player.create': '➕', 'player.update': '✏️', 'player.delete': '🗑️', 'player.sr_adjust': '🎚️', 'player.reset_stats': '♻️',
  'players.reset_all_sr': '♻️', 'match.result': '⚔️', 'match.clear': '🧹', 'match.players': '🔁', 'match.create': '➕',
  'match.delete': '🗑️', 'tournament.create': '🏆', 'tournament.update': '✏️', 'tournament.delete': '🗑️', 'tournament.seed': '🎲',
  'tournament.resize': '📐', 'tournament.reset': '♻️', 'tournament.byes': '⏭️', 'settings.update': '⚙️', 'admin.login': '🔑',
  'admin.create': '➕', 'admin.update': '✏️', 'admin.delete': '🗑️', 'discord.connect': '🔌', 'discord.panel': '📌',
};

export function channelFor(action) {
  if (action.startsWith('registration.') || action === 'player.approve' || action === 'player.reject') return 'registrations';
  if (action.startsWith('player.') || action.startsWith('players.')) return 'players';
  if (action.startsWith('match.')) return 'matches';
  if (action.startsWith('tournament.')) return 'tournaments';
  if (action.startsWith('settings.')) return 'settings';
  if (action.startsWith('admin.')) return 'admins';
  return 'system';
}

const clean = (s) => String(s ?? '').replace(/@(everyone|here)/g, '@​$1');
const cut = (s, n = 1000) => { const t = clean(s); return t.length > n ? `${t.slice(0, n - 1)}…` : t || '—'; };
const unix = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const tsTag = (iso, style = 'R') => (iso ? `<t:${unix(iso)}:${style}>` : '—');

/* Labels in Arabic or English (Admin → Discord → log language). */
const L = {
  ar: {
    by: 'بواسطة', player: 'اللاعب', battletag: 'BattleTag', discord: 'ديسكورد', ow_rank: 'رانك أوفرواتش', sr: 'النقاط', rank: 'الرانك',
    reason: 'السبب', notes: 'ملاحظات', created: 'إنشاء الحساب', joined: 'دخول السيرفر', change: 'التغيير', changed: 'التعديلات',
    tournament: 'البطولة', round: 'الدور', points: 'النقاط', friendly: 'ودية — بدون نقاط', score: 'النتيجة', format: 'النوع',
    size: 'الخانات', status: 'الحالة', players: 'اللاعبين', single: 'خروج المغلوب', double: 'خروج مزدوج (لوَر براكت)', showmatch: 'مباراة ودية',
    winner: 'الفائز', none: '—', details: 'التفاصيل', open: 'فتح في الموقع', live: 'مباشر', pending: 'لم تبدأ', completed: 'منتهية',
    upcoming: 'قادمة', site_log: 'سجل الموقع',
    t: {
      'registration.submit': 'تسجيل جديد', 'registration.update': 'تحديث بيانات لاعب', 'player.approve': 'تم قبول لاعب',
      'player.reject': 'تم رفض تسجيل', 'player.create': 'إضافة لاعب', 'player.update': 'تعديل لاعب', 'player.delete': 'حذف لاعب',
      'player.sr_adjust': 'تعديل نقاط', 'player.reset_stats': 'تصفير إحصائيات لاعب', 'players.reset_all_sr': 'ترجيع نقاط كل اللاعبين',
      'match.result': 'نتيجة مباراة', 'match.clear': 'مسح نتيجة', 'match.players': 'تغيير لاعبي مباراة', 'match.create': 'مباراة ودية جديدة',
      'match.delete': 'حذف مباراة', 'tournament.create': 'بطولة جديدة', 'tournament.update': 'تعديل بطولة', 'tournament.delete': 'حذف بطولة',
      'tournament.seed': 'توزيع اللاعبين', 'tournament.resize': 'تغيير شكل الشجرة', 'tournament.reset': 'تصفير نتائج البطولة',
      'tournament.byes': 'تأهيل تلقائي (BYE)', 'settings.update': 'تعديل الإعدادات', 'admin.login': 'تسجيل دخول للوحة',
      'admin.create': 'إضافة مشرف', 'admin.update': 'تعديل مشرف', 'admin.delete': 'حذف مشرف', 'discord.connect': 'ربط البوت',
      'discord.panel': 'نشر لوحة التسجيل', 'demo.seed': 'بيانات تجريبية',
    },
  },
  en: {
    by: 'By', player: 'Player', battletag: 'BattleTag', discord: 'Discord', ow_rank: 'Overwatch rank', sr: 'SR', rank: 'Rank',
    reason: 'Reason', notes: 'Notes', created: 'Account created', joined: 'Joined server', change: 'Change', changed: 'Changes',
    tournament: 'Tournament', round: 'Round', points: 'Points', friendly: 'Exhibition — no SR', score: 'Score', format: 'Format',
    size: 'Cells', status: 'Status', players: 'Players', single: 'Single elimination', double: 'Double elimination', showmatch: 'Showmatch',
    winner: 'Winner', none: '—', details: 'Details', open: 'Open on the site', live: 'Live', pending: 'Pending', completed: 'Completed',
    upcoming: 'Upcoming', site_log: 'Site log',
    t: {
      'registration.submit': 'New registration', 'registration.update': 'Registration updated', 'player.approve': 'Player accepted',
      'player.reject': 'Registration rejected', 'player.create': 'Player added', 'player.update': 'Player edited', 'player.delete': 'Player deleted',
      'player.sr_adjust': 'SR adjusted', 'player.reset_stats': 'Player stats reset', 'players.reset_all_sr': 'All players reset to starting SR',
      'match.result': 'Match result', 'match.clear': 'Result cleared', 'match.players': 'Match line-up changed', 'match.create': 'New showmatch',
      'match.delete': 'Match deleted', 'tournament.create': 'Tournament created', 'tournament.update': 'Tournament edited',
      'tournament.delete': 'Tournament deleted', 'tournament.seed': 'Players seeded', 'tournament.resize': 'Bracket changed',
      'tournament.reset': 'Tournament results reset', 'tournament.byes': 'Byes advanced', 'settings.update': 'Settings changed',
      'admin.login': 'Admin signed in', 'admin.create': 'Admin added', 'admin.update': 'Admin edited', 'admin.delete': 'Admin removed',
      'discord.connect': 'Bot connected', 'discord.panel': 'Registration panel posted', 'demo.seed': 'Demo data',
    },
  },
};

const OW = {
  unranked: 'Unranked', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond',
  master: 'Master', grandmaster: 'Grandmaster', champion: 'Champion', top500: 'Top 500',
};

/** Look up what a log entry is about (player / match / tournament) so the card can show real details. */
function subjectOf(row) {
  const a = row.action;
  const d = String(row.details ?? '');
  if (a.startsWith('match.')) {
    const id = Number(/^#(\d+)/.exec(d)?.[1]);
    const m = id ? get(`SELECT m.*, t.name AS tournament_name, t.size AS tournament_size, t.format AS tournament_format, t.affects_sr
      FROM matches m LEFT JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = ?`, id) : null;
    return { match: m };
  }
  if (a.startsWith('player.') || a.startsWith('registration.')) {
    const id = Number(/\(#(\d+)\)/.exec(d)?.[1]);
    return { player: id ? getPlayer(id) : null };
  }
  if (a.startsWith('tournament.')) {
    const id = Number(/\(#(\d+)/.exec(d)?.[1]);
    const t = id ? get('SELECT t.*, (SELECT COUNT(*) FROM tournament_entries e WHERE e.tournament_id = t.id) AS players FROM tournaments t WHERE t.id = ?', id) : null;
    return { tournament: t };
  }
  return {};
}

const avatarOf = (p) => (p?.avatar_url && /^https:\/\//.test(p.avatar_url) ? p.avatar_url : null);
const nameOf = (p) => (p ? playerName(p) : null);
const tierName = (sr) => rankOf(ranks(), sr)?.name ?? '';

/** Build the Discord embed for one activity-log entry. */
export function buildEmbed(row) {
  const lang = setting('log_lang') === 'en' ? 'en' : 'ar';
  const l = L[lang];
  const def = LOG_CHANNELS.find((c) => c.key === channelFor(row.action)) ?? LOG_CHANNELS.at(-1);
  const icon = ICONS[row.action] ?? '•';
  const e = new EmbedBuilder()
    .setColor(def.color)
    .setTitle(`${icon}  ${l.t[row.action] ?? row.action}`)
    .setTimestamp(new Date(row.created_at))
    .setFooter({ text: `${setting('site_name')} · ${l.site_log} #${row.id} · ${row.action}` });
  const fields = [];
  const add = (name, value, inline = true) => { if (value !== undefined && value !== null && value !== '') fields.push({ name, value: cut(value, 1024), inline }); };
  const site = (path) => (config.publicUrl ? `${config.publicUrl}${path}` : null);
  const sub = subjectOf(row);
  const detailsAfterColon = String(row.details ?? '').replace(/^[^:]*:\s*/, '');

  if (sub.player !== undefined) {
    const p = sub.player;
    if (p) {
      e.setAuthor({ name: nameOf(p), iconURL: avatarOf(p) ?? undefined, url: site(`/player/${p.id}`) ?? undefined });
      if (avatarOf(p)) e.setThumbnail(avatarOf(p));
      if (site(`/player/${p.id}`) && p.status === 'approved') e.setURL(site(`/player/${p.id}`));
    }
    switch (row.action) {
      case 'registration.submit':
      case 'registration.update':
        add(l.battletag, p?.battletag && `\`${p.battletag}\``);
        add(l.ow_rank, p && `${OW[p.rank_tier] ?? p.rank_tier}${p.rank_division ? ` ${p.rank_division}` : ''}`);
        add(l.discord, p?.discord_id && `<@${p.discord_id}>`);
        add(l.created, p?.discord_created_at && tsTag(p.discord_created_at, 'D'));
        add(l.joined, p?.guild_joined_at && tsTag(p.guild_joined_at, 'R'));
        add(l.notes, p?.notes, false);
        break;
      case 'player.approve':
        add(l.battletag, p?.battletag && `\`${p.battletag}\``);
        add(l.discord, p?.discord_id && `<@${p.discord_id}>`);
        add(l.sr, p && `**${p.sr}** · ${tierName(p.sr)}`);
        add(l.ow_rank, p && `${OW[p.rank_tier] ?? p.rank_tier}${p.rank_division ? ` ${p.rank_division}` : ''}`);
        break;
      case 'player.reject':
        add(l.battletag, p?.battletag && `\`${p.battletag}\``);
        add(l.discord, p?.discord_id && `<@${p.discord_id}>`);
        add(l.reason, p?.reject_reason || l.none, false);
        break;
      case 'player.sr_adjust': {
        const m = /:\s*([+-]?\d+)\s*\((.*)\)\s*$/.exec(row.details ?? '');
        if (m) add(l.change, `${Number(m[1]) > 0 ? '🟩' : '🟥'} **${Number(m[1]) > 0 ? '+' : ''}${m[1]}**`);
        add(l.sr, p && `**${p.sr}** · ${tierName(p.sr)}`);
        if (m) add(l.reason, m[2]);
        break;
      }
      case 'player.update':
        add(l.changed, detailsAfterColon.split(',').map((x) => `\`${x.trim()}\``).join(' '), false);
        add(l.sr, p && `**${p.sr}** · ${tierName(p.sr)}`);
        break;
      default:
        if (p) add(l.sr, `**${p.sr}** · ${tierName(p.sr)}`);
        else e.setDescription(cut(row.details, 2000));
    }
  } else if (sub.match !== undefined) {
    const m = sub.match;
    if (m) {
      const p1 = getPlayer(m.player1_id);
      const p2 = getPlayer(m.player2_id);
      const w = m.winner_id ? getPlayer(m.winner_id) : null;
      const n1 = nameOf(p1) ?? 'TBD';
      const n2 = nameOf(p2) ?? 'TBD';
      const mark = (pid) => (m.winner_id && m.winner_id === pid ? '🏆 ' : '');
      e.setDescription(`### ${mark(m.player1_id)}${clean(n1)}  \`${m.score1} - ${m.score2}\`  ${clean(n2)}${mark(m.player2_id) ? ' 🏆' : ''}`);
      if (avatarOf(w)) e.setThumbnail(avatarOf(w));
      add(l.tournament, m.tournament_id ? `${clean(m.tournament_name)} · ${roundName(m.round, m.tournament_size, m.tournament_format)}` : l.showmatch);
      if (m.status === 'live') add(l.status, `🔴 ${l.live}`);
      if (m.winner_id && !m.is_bye) {
        const loser = m.winner_id === m.player1_id ? p2 : p1;
        add(l.points, m.applied
          ? `🟩 ${clean(nameOf(w))} **+${m.sr_gain}** → ${w?.sr ?? ''}\n🟥 ${clean(nameOf(loser))} **−${m.sr_loss}** → ${loser?.sr ?? ''}`
          : l.friendly, false);
      }
      if (m.tournament_id && site(`/tournaments/${m.tournament_id}`)) e.setURL(site(`/tournaments/${m.tournament_id}`));
    } else {
      e.setDescription(cut(row.details, 2000));
    }
  } else if (sub.tournament !== undefined) {
    const t = sub.tournament;
    if (t) {
      e.setDescription(`### ${clean(t.name)}`);
      add(l.format, t.format === 'double' ? l.double : l.single);
      add(l.size, `${t.players} / ${t.size}`);
      add(l.status, l[t.status] ?? t.status);
      if (t.champion_id) add(l.winner, `🏆 ${clean(nameOf(getPlayer(t.champion_id)))}`);
      if (row.action === 'tournament.update' || row.action === 'tournament.resize' || row.action === 'tournament.seed') add(l.changed, detailsAfterColon, false);
      if (site(`/tournaments/${t.id}`)) e.setURL(site(`/tournaments/${t.id}`));
    } else {
      e.setDescription(cut(row.details, 2000));
    }
  } else if (row.action === 'settings.update') {
    e.setDescription(String(row.details ?? '').split(' · ').map((x) => `• ${clean(x)}`).join('\n').slice(0, 4000) || '—');
  } else {
    e.setDescription(cut(row.details, 2000));
  }

  add(l.by, `**${clean(row.actor)}**`);
  add('⏱', tsTag(row.created_at, 'R'));
  if (fields.length) e.addFields(fields.slice(0, 25));
  return e;
}

/** Wires the log to a bot. `getClient()` returns the logged-in discord.js client or null. */
export function createLogger({ getClient, log, warn }) {
  const queues = new Map();
  let timer = null;
  let ensuring = null;

  const enabled = () => setting('log_enabled') && !!setting('log_category_id');

  async function category() {
    const c = getClient();
    const id = setting('log_category_id');
    if (!c || !id) return null;
    const cat = await c.channels.fetch(id).catch(() => null);
    return cat?.type === ChannelType.GuildCategory ? cat : null;
  }

  /** Make sure every log channel exists in the category. Returns { ok, created, error }. */
  async function ensureChannels() {
    if (ensuring) return ensuring;
    ensuring = (async () => {
      const cat = await category();
      if (!cat) return { ok: false, created: 0, error: 'category_not_found' };
      const guild = cat.guild;
      const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
      if (me && !me.permissionsIn(cat).has(PermissionFlagsBits.ManageChannels)) {
        return { ok: false, created: 0, error: 'missing_manage_channels' };
      }
      const existing = await guild.channels.fetch().catch(() => null);
      let created = 0;
      for (const def of LOG_CHANNELS) {
        const savedId = getInternal(`log_channel_${def.key}`);
        let ch = savedId ? existing?.get(savedId) ?? null : null;
        if (ch && ch.parentId !== cat.id) ch = null;
        if (!ch) ch = existing?.find((x) => x?.parentId === cat.id && x.name === def.name) ?? null;
        if (!ch) {
          ch = await guild.channels.create({ name: def.name, type: ChannelType.GuildText, parent: cat.id, topic: def.topic, reason: 'REIN 1V1 site log' })
            .catch((e) => { warn('log channel create failed:', e.message); return null; });
          if (ch) created++;
        }
        if (ch) setInternal(`log_channel_${def.key}`, ch.id);
      }
      if (created) log(`created ${created} log channel(s) in #${cat.name}`);
      return { ok: true, created, category: cat.name };
    })();
    try {
      return await ensuring;
    } finally {
      ensuring = null;
    }
  }

  async function channel(key) {
    const c = getClient();
    if (!c) return null;
    let id = getInternal(`log_channel_${key}`);
    let ch = id ? await c.channels.fetch(id).catch(() => null) : null;
    if (!ch) {
      await ensureChannels();
      id = getInternal(`log_channel_${key}`);
      ch = id ? await c.channels.fetch(id).catch(() => null) : null;
    }
    return ch?.isTextBased?.() ? ch : null;
  }

  // Batch per channel so a burst (e.g. bracket propagation) becomes one message with up to 10 cards.
  async function flush() {
    timer = null;
    for (const [key, rows] of queues) {
      queues.delete(key);
      if (!rows.length) continue;
      const ch = await channel(key);
      if (!ch) continue;
      const embeds = rows;
      for (let i = 0; i < embeds.length; i += 10) {
        await ch.send({ embeds: embeds.slice(i, i + 10), allowedMentions: { parse: [] } }).catch((e) => warn('log send failed:', e.message));
      }
    }
  }

  bus.on('audit', (row) => {
    if (!enabled() || !getClient()) return;
    const key = channelFor(row.action);
    if (!queues.has(key)) queues.set(key, []);
    // Build the card right away so it shows the values at the moment of the action.
    let card;
    try {
      card = buildEmbed(row);
    } catch (err) {
      warn('log card failed:', err.message);
      card = new EmbedBuilder().setDescription(`${row.action} — ${cut(row.details, 1500)}`);
    }
    queues.get(key).push(card);
    if (!timer) timer = setTimeout(() => flush().catch((e) => warn('log flush failed:', e.message)), 1500);
  });

  return {
    ensureChannels,
    status() {
      return {
        enabled: !!setting('log_enabled'),
        category_id: setting('log_category_id') || null,
        channels: LOG_CHANNELS.map((d) => ({ key: d.key, name: d.name, id: getInternal(`log_channel_${d.key}`) })),
      };
    },
  };
}
