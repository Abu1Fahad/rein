import {
  Client, Events, GatewayIntentBits, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} from 'discord.js';
import { config } from '../config.js';
import { get } from '../db.js';
import { bus } from '../events.js';
import { HttpError } from '../http.js';
import { setting, getInternal, setInternal } from '../services/settings.js';
import { audit } from '../services/audit.js';
import {
  applyDiscordProfile, approvePlayer, getByDiscordId, getPlayer, leaderboard, rejectPlayer,
  setReviewMessage, submitRegistration,
} from '../services/players.js';
import { all } from '../db.js';
import { decorateMatches } from '../services/competition.js';
import { createLogger } from './logs.js';
import {
  COLORS, decisionDm, leaderboardCard, notice, panelMessage, profileCard, profileUpdatedCard,
  registrationModal, rejectReasonModal, resultCard, reviewCard, statusCard,
} from './ui.js';

// View Channels, Send Messages, Embed Links, Read History, Manage Roles, Manage Channels (log channels)
const INVITE_PERMISSIONS = 268520448n | 16n;

const state = {
  client: null,
  ready: false,
  error: null,
  lastSync: null,
  syncing: false,
  syncTimer: null,
  commands: null,
};

/** The bot token comes from .env (DISCORD_TOKEN) or, if that is empty, from Admin → Discord. */
const tokenOf = () => config.discord.token || getInternal('discord_token') || '';
const membersIntentOn = () => config.discord.membersIntent || getInternal('discord_members_intent') === '1';

const log = (...args) => console.log('[bot]', ...args);
const warn = (...args) => console.warn('[bot]', ...args);
const logs = createLogger({ getClient: () => (state.ready ? state.client : null), log, warn });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- helpers */

function client() {
  if (!state.client || !state.ready) throw new HttpError(503, 'bot_offline');
  return state.client;
}

function guildId() {
  const c = state.client;
  const configured = setting('guild_id');
  if (configured) return configured;
  return c?.guilds.cache.size === 1 ? c.guilds.cache.first().id : null;
}

async function getGuild() {
  const id = guildId();
  if (!id || !state.ready) return null;
  return state.client.guilds.cache.get(id) ?? (await state.client.guilds.fetch(id).catch(() => null));
}

async function textChannel(id) {
  if (!id || !state.ready) return null;
  const ch = await state.client.channels.fetch(id).catch(() => null);
  return ch?.isTextBased?.() && 'send' in ch ? ch : null;
}

/** Everything we read straight from Discord — no OAuth or account linking needed. */
export function profileFrom(user, member) {
  const source = member ?? user;
  return {
    id: user.id,
    username: user.username,
    displayName: member?.displayName ?? user.globalName ?? user.username,
    avatarUrl: source.displayAvatarURL({ size: 256, extension: 'png' }),
    createdAt: user.createdAt?.toISOString() ?? null,
    joinedAt: member?.joinedAt?.toISOString() ?? undefined,
  };
}

function memberOf(interaction) {
  return interaction.inCachedGuild?.() ? interaction.member : null;
}

function reviewerId(interaction) {
  return `discord:${interaction.user.id}:${interaction.user.username}`;
}

function canReview(interaction) {
  const perms = interaction.memberPermissions;
  if (perms?.has(PermissionFlagsBits.ManageGuild)) return true;
  const roleId = setting('admin_role_id');
  if (!roleId || !interaction.member) return false;
  const roles = interaction.member.roles;
  return Array.isArray(roles) ? roles.includes(roleId) : !!roles?.cache?.has(roleId);
}

const ERRORS = {
  invalid_battletag: ['❌ BattleTag غير صحيح', 'لازم يكون بالشكل `Name#1234`.\nInvalid BattleTag — use the format `Name#1234`.'],
  battletag_taken: ['❌ BattleTag مستخدم', 'هذا الـ BattleTag مسجل لحساب ديسكورد آخر.\nThis BattleTag is already registered to another account.'],
  registration_closed: ['🔒 التسجيل مغلق', 'التسجيل مغلق حالياً، تابع الإعلانات.\nRegistration is currently closed.'],
  banned: ['⛔ محظور', 'لا يمكنك التسجيل. تواصل مع الإدارة.\nYou cannot register. Contact the admins.'],
  already_approved: ['ℹ️ تمت المراجعة', 'هذا الطلب مقبول مسبقاً.\nThis registration was already accepted.'],
  already_rejected: ['ℹ️ تمت المراجعة', 'هذا الطلب مرفوض مسبقاً.\nThis registration was already rejected.'],
  player_not_found: ['❓ غير موجود', 'اللاعب غير موجود (ربما تم حذفه).\nPlayer not found.'],
};

function errorNotice(code) {
  const [title, body] = ERRORS[code] ?? ['⚠️ خطأ · Error', 'حدث خطأ غير متوقع، حاول مرة ثانية.\nSomething went wrong, please try again.'];
  return notice({ title, body, color: COLORS.red });
}

/* ---------------------------------------------------------------- review channel */

async function postReviewCard(player, outcome) {
  const channel = await textChannel(setting('review_channel_id'));
  if (!channel) {
    warn('review channel not configured or not reachable — review this registration from the web admin panel');
    return;
  }
  if (outcome === 'updated_approved') {
    await channel.send(profileUpdatedCard(player)).catch((e) => warn('profile update notice failed:', e.message));
    return;
  }
  if (outcome === 'updated_pending' && player.review_message_id && player.review_channel_id === channel.id) {
    const ok = await channel.messages.edit(player.review_message_id, reviewCard(player)).then(() => true, () => false);
    if (ok) return;
  }
  const msg = await channel.send(reviewCard(player));
  setReviewMessage(player.id, channel.id, msg.id);
}

async function refreshReviewCard(player) {
  if (!player.review_channel_id || !player.review_message_id) return;
  const channel = await textChannel(player.review_channel_id);
  await channel?.messages.edit(player.review_message_id, reviewCard(player)).catch((e) => warn('review card edit failed:', e.message));
}

async function setPlayerRole(discordId, add) {
  const roleId = setting('player_role_id');
  if (!roleId || !discordId) return;
  const guild = await getGuild();
  const member = await guild?.members.fetch(discordId).catch(() => null);
  if (!member) return;
  const has = member.roles.cache.has(roleId);
  if (add && !has) await member.roles.add(roleId, 'Reinhardt 1v1 registration accepted').catch((e) => warn('role add failed:', e.message));
  if (!add && has) await member.roles.remove(roleId, 'Reinhardt 1v1 registration revoked').catch((e) => warn('role remove failed:', e.message));
}

async function onReviewed(player) {
  if (!state.ready) return;
  await refreshReviewCard(player);
  await setPlayerRole(player.discord_id, player.status === 'approved');
  if (setting('dm_players') && player.discord_id && ['approved', 'rejected'].includes(player.status)) {
    const user = await state.client.users.fetch(player.discord_id).catch(() => null);
    await user?.send(decisionDm(player)).catch(() => warn(`could not DM ${player.username} (DMs closed?)`));
  }
}

async function onMatchCompleted(matchId) {
  if (!state.ready || !setting('announce_results')) return;
  const channel = await textChannel(setting('results_channel_id'));
  if (!channel) return;
  const row = get(`SELECT m.*, t.name AS tournament_name, t.size AS tournament_size, t.format AS tournament_format FROM matches m
    LEFT JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = ?`, matchId);
  if (!row?.winner_id) return;
  const [m] = decorateMatches([row]);
  const winner = m.winner_id === m.player1_id ? m.p1 : m.p2;
  const loser = m.winner_id === m.player1_id ? m.p2 : m.p1;
  if (!winner || !loser) return;
  await channel.send(resultCard(m, winner, loser)).catch((e) => warn('result post failed:', e.message));
}

/* ---------------------------------------------------------------- panel */

async function postPanel(channelOverride) {
  client();
  const channel = channelOverride ?? (await textChannel(setting('registration_channel_id')));
  if (!channel) throw new HttpError(400, 'registration_channel_missing');
  const prev = { channel: getInternal('panel_channel_id'), message: getInternal('panel_message_id') };
  if (prev.channel === channel.id && prev.message) {
    const edited = await channel.messages.edit(prev.message, panelMessage()).then(() => true, () => false);
    if (edited) return { ok: true, edited: true, channel_id: channel.id, message_id: prev.message };
  }
  const msg = await channel.send(panelMessage());
  setInternal('panel_channel_id', channel.id);
  setInternal('panel_message_id', msg.id);
  audit('bot', 'discord.panel', `#${channel.name ?? channel.id}`);
  return { ok: true, edited: false, channel_id: channel.id, message_id: msg.id };
}

let panelRefresh = null;
function refreshPanelSoon() {
  clearTimeout(panelRefresh);
  panelRefresh = setTimeout(async () => {
    const channelId = getInternal('panel_channel_id');
    const messageId = getInternal('panel_message_id');
    if (!state.ready || !channelId || !messageId) return;
    const channel = await textChannel(channelId);
    await channel?.messages.edit(messageId, panelMessage()).catch(() => {});
  }, 1500);
}

/* ---------------------------------------------------------------- sync */

async function syncOne(discordId) {
  client();
  const guild = await getGuild();
  const member = guild ? await guild.members.fetch({ user: discordId, force: true }).catch(() => null) : null;
  const user = member?.user ?? (await state.client.users.fetch(discordId, { force: true }).catch(() => null));
  if (!user) return false;
  const profile = profileFrom(user, member);
  if (guild) profile.inGuild = !!member;
  return applyDiscordProfile(profile);
}

async function syncAll() {
  client();
  if (state.syncing) return { ok: false, running: true };
  state.syncing = true;
  const started = Date.now();
  let checked = 0;
  let updated = 0;
  let failed = 0;
  try {
    const rows = all("SELECT discord_id FROM players WHERE discord_id IS NOT NULL AND status != 'rejected'");
    for (const { discord_id: id } of rows) {
      try {
        if (await syncOne(id)) updated++;
        checked++;
      } catch {
        failed++;
      }
      await sleep(350);
    }
  } finally {
    state.syncing = false;
  }
  state.lastSync = { at: new Date().toISOString(), checked, updated, failed, ms: Date.now() - started };
  if (updated) log(`sync: ${updated}/${checked} profiles updated`);
  return { ok: true, ...state.lastSync };
}

function scheduleSync() {
  clearTimeout(state.syncTimer);
  const minutes = Math.max(5, setting('sync_interval_min'));
  state.syncTimer = setTimeout(async () => {
    await syncAll().catch((e) => warn('sync failed:', e.message));
    scheduleSync();
  }, minutes * 60_000);
  state.syncTimer.unref?.();
}

/* ---------------------------------------------------------------- commands */

const COMMANDS = [
  new SlashCommandBuilder().setName('register').setDescription('Register for the Reinhardt 1v1 tournament · التسجيل في البطولة'),
  new SlashCommandBuilder().setName('status').setDescription('Your registration status · حالة تسجيلك'),
  new SlashCommandBuilder().setName('profile').setDescription('Show a player profile · عرض ملف لاعب')
    .addUserOption((o) => o.setName('user').setDescription('Player · اللاعب').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Top 10 SR leaderboard · ترتيب أعلى 10'),
  new SlashCommandBuilder().setName('panel').setDescription('Post the registration panel here · نشر لوحة التسجيل هنا')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
];

async function registerCommands() {
  const c = client();
  const body = COMMANDS.map((cmd) => cmd.toJSON());
  const guild = await getGuild();
  if (guild) {
    await guild.commands.set(body);
    state.commands = { scope: 'guild', guild: guild.name, count: body.length };
  } else {
    await c.application.commands.set(body);
    state.commands = { scope: 'global', count: body.length };
  }
  log(`slash commands registered (${state.commands.scope})`);
  return state.commands;
}

/* ---------------------------------------------------------------- interactions */

async function openRegistration(i) {
  const p = getByDiscordId(i.user.id);
  if (p?.status === 'banned') return i.reply(errorNotice('banned'));
  if (!setting('registration_open') && p?.status !== 'approved') return i.reply(errorNotice('registration_closed'));
  return i.showModal(registrationModal(p));
}

async function onCommand(i) {
  switch (i.commandName) {
    case 'register':
      return openRegistration(i);
    case 'status':
      return i.reply(statusCard(getByDiscordId(i.user.id)));
    case 'leaderboard':
      return i.reply(leaderboardCard(leaderboard()));
    case 'profile': {
      const target = i.options.getUser('user') ?? i.user;
      const p = getByDiscordId(target.id);
      const entry = p ? leaderboard().find((e) => e.id === p.id) : null;
      if (!entry) {
        return i.reply(notice({ title: 'غير مسجل · Not on the ladder', body: `<@${target.id}> ليس ضمن الترتيب.\nThis user is not an approved player.` }));
      }
      return i.reply(profileCard(entry));
    }
    case 'panel': {
      if (!canReview(i)) return i.reply(notice({ title: '⛔', body: 'Admins only · للإدارة فقط', color: COLORS.red }));
      const res = await postPanel(i.channel);
      return i.reply(notice({ title: '✅ Panel posted', body: res.edited ? 'Updated the existing panel.' : `Posted in <#${res.channel_id}>.` }));
    }
    default:
      return undefined;
  }
}

async function onButton(i) {
  const [scope, action, rawId] = i.customId.split(':');
  if (scope !== 'reg') return undefined;
  if (action === 'open') return openRegistration(i);
  if (action === 'status') return i.reply(statusCard(getByDiscordId(i.user.id)));

  if (action === 'accept' || action === 'reject') {
    if (!canReview(i)) return i.reply(notice({ title: '⛔ Admins only', body: 'هذا الزر للإدارة فقط.\nOnly admins can review registrations.', color: COLORS.red }));
    const id = Number(rawId);
    const player = getPlayer(id);
    if (!player) return i.reply(errorNotice('player_not_found'));
    if (player.status !== 'pending') {
      await i.update(reviewCard(player));
      return undefined;
    }
    if (action === 'reject') return i.showModal(rejectReasonModal(id));
    await i.deferUpdate();
    try {
      approvePlayer(id, reviewerId(i)); // the review card is refreshed by the 'registration:reviewed' listener
    } catch (err) {
      await i.followUp(errorNotice(err.code));
    }
  }
  return undefined;
}

async function onModal(i) {
  if (i.customId === 'reg:modal') {
    const fields = i.fields;
    const pick = (id) => {
      try {
        return fields.getStringSelectValues(id)?.[0] ?? null;
      } catch {
        return null;
      }
    };
    let notes = '';
    try {
      notes = fields.getTextInputValue('notes') ?? '';
    } catch {
      notes = '';
    }
    let result;
    try {
      result = submitRegistration({
        discord: { ...profileFrom(i.user, memberOf(i)), inGuild: i.inGuild() ? true : undefined },
        battletag: fields.getTextInputValue('battletag'),
        rankTier: pick('rank_tier'),
        rankDivision: pick('rank_division'),
        notes,
      });
    } catch (err) {
      return i.reply(errorNotice(err.code));
    }
    const { player, outcome } = result;
    const replies = {
      created: ['✅ تم إرسال طلبك · Request sent', 'طلبك الآن قيد المراجعة، بيوصلك رد في الخاص.\nYour registration is pending review — you will get a DM.'],
      reapplied: ['✅ تم إرسال طلبك من جديد · Re-submitted', 'طلبك الآن قيد المراجعة.\nYour registration is pending review again.'],
      updated_pending: ['✏️ تم تحديث طلبك · Request updated', 'طلبك ما زال قيد المراجعة.\nYour request is still pending review.'],
      updated_approved: ['✏️ تم تحديث بياناتك · Profile updated', 'تم تحديث الـ BattleTag والرانك.\nYour BattleTag and rank were updated.'],
    };
    const [title, body] = replies[outcome];
    await i.reply(notice({ title, body: `${body}\n-# \`${player.battletag}\``, color: COLORS.green }));
    await postReviewCard(player, outcome).catch((e) => warn('review card failed:', e.message));
    return undefined;
  }

  if (i.customId.startsWith('reg:rejectmodal:')) {
    if (!canReview(i)) return i.reply(notice({ title: '⛔ Admins only', body: 'Only admins can review registrations.', color: COLORS.red }));
    const id = Number(i.customId.split(':')[2]);
    let reason = '';
    try {
      reason = i.fields.getTextInputValue('reason') ?? '';
    } catch {
      reason = '';
    }
    if (i.isFromMessage()) await i.deferUpdate();
    else await i.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      rejectPlayer(id, reviewerId(i), reason);
      if (!i.isFromMessage()) await i.editReply({ content: 'Rejected.' });
    } catch (err) {
      await i.followUp(errorNotice(err.code));
    }
  }
  return undefined;
}

/* ---------------------------------------------------------------- lifecycle */

function wireEvents(c) {
  c.once(Events.ClientReady, async () => {
    state.ready = true;
    state.error = null;
    log(`online as ${c.user.tag} in ${c.guilds.cache.size} server(s)`);
    if (!guildId()) warn('set the Discord server (guild) ID in Admin → Discord so commands and sync know where to look');
    await registerCommands().catch((e) => warn('command registration failed:', e.message));
    scheduleSync();
    setTimeout(() => syncAll().catch(() => {}), 10_000).unref?.();
    if (setting('log_enabled')) {
      logs.ensureChannels().then((r) => { if (!r.ok) warn('log channels:', r.error); }).catch((e) => warn('log channels:', e.message));
    }
  });

  c.on(Events.InteractionCreate, async (i) => {
    try {
      if (getByDiscordId(i.user.id)) applyDiscordProfile(profileFrom(i.user, memberOf(i)));
      if (i.isChatInputCommand()) await onCommand(i);
      else if (i.isButton()) await onButton(i);
      else if (i.isModalSubmit()) await onModal(i);
    } catch (err) {
      warn('interaction failed:', err);
      const payload = errorNotice(err.code);
      if (i.isRepliable()) {
        if (i.deferred || i.replied) await i.followUp(payload).catch(() => {});
        else await i.reply(payload).catch(() => {});
      }
    }
  });

  if (membersIntentOn()) {
    const inGuild = (g) => g.id === guildId();
    c.on(Events.GuildMemberUpdate, (_old, m) => inGuild(m.guild) && applyDiscordProfile({ ...profileFrom(m.user, m), inGuild: true }));
    c.on(Events.GuildMemberAdd, (m) => inGuild(m.guild) && applyDiscordProfile({ ...profileFrom(m.user, m), inGuild: true }));
    c.on(Events.GuildMemberRemove, (m) => inGuild(m.guild) && applyDiscordProfile({ ...profileFrom(m.user, null), inGuild: false }));
    c.on(Events.UserUpdate, (_old, u) => {
      const member = c.guilds.cache.get(guildId())?.members.cache.get(u.id) ?? null;
      applyDiscordProfile(profileFrom(u, member));
    });
  }

  c.on(Events.Error, (e) => {
    state.error = e.message;
    warn('client error:', e.message);
  });
  c.on(Events.ShardDisconnect, () => { state.ready = false; });
  c.on(Events.ShardResume, () => { state.ready = true; });
}

bus.on('registration:reviewed', (p) => onReviewed(p).catch((e) => warn('review follow-up failed:', e.message)));
bus.on('match:completed', (id) => onMatchCompleted(id).catch((e) => warn('announce failed:', e.message)));
bus.on('player:deleted', (p) => setPlayerRole(p.discord_id, false).catch(() => {}));
bus.on('change', (ch) => { if (ch.scope === 'settings') { refreshPanelSoon(); scheduleSync(); } });
let lastLogCategory = null;
bus.on('change', (ch) => {
  if (ch.scope !== 'settings' || !state.ready || !setting('log_enabled')) return;
  const cat = setting('log_category_id');
  if (cat && cat !== lastLogCategory) {
    lastLogCategory = cat;
    logs.ensureChannels().catch(() => {});
  }
});

async function start() {
  const token = tokenOf();
  if (!token) {
    log('no bot token yet — running website only (add it in Admin → Discord)');
    return;
  }
  const intents = [GatewayIntentBits.Guilds];
  if (membersIntentOn()) intents.push(GatewayIntentBits.GuildMembers);
  const c = new Client({ intents, allowedMentions: { parse: [] } });
  state.client = c;
  wireEvents(c);
  try {
    await c.login(token);
  } catch (err) {
    state.error = /disallowed intents/i.test(err.message)
      ? 'Server Members intent is not enabled in the Developer Portal — enable it there or turn it off here.'
      : /invalid token|TokenInvalid/i.test(err.message) ? 'The bot token is wrong. Copy it again from the Developer Portal (Bot → Reset Token).' : err.message;
    warn('login failed:', state.error);
  }
}

async function stop() {
  clearTimeout(state.syncTimer);
  const c = state.client;
  state.client = null;
  state.ready = false;
  state.commands = null;
  if (c) await c.destroy().catch(() => {});
}

async function restart() {
  await stop();
  state.error = null;
  await start();
  // Give Discord a moment to report "ready" so the panel can show the result straight away.
  for (let i = 0; i < 40 && state.client && !state.ready && !state.error; i++) await sleep(250);
}

/** Save the bot token (and optional members intent) entered in the admin panel, then reconnect. */
async function connect({ token, membersIntent } = {}) {
  if (config.discord.token && token) throw new HttpError(400, 'token_in_env');
  if (token !== undefined) {
    const clean = String(token || '').trim().replace(/^Bot\s+/i, '');
    if (clean && !/^[\w-]{20,}\.[\w-]{4,}\.[\w-]{20,}$/.test(clean)) throw new HttpError(400, 'invalid_bot_token');
    setInternal('discord_token', clean || null);
  }
  if (membersIntent !== undefined) setInternal('discord_members_intent', membersIntent ? '1' : '0');
  await restart();
  return bot.status();
}

function inviteUrl() {
  const id = state.client?.user?.id || config.discord.clientId;
  if (!id) return null;
  return `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot%20applications.commands&permissions=${INVITE_PERMISSIONS}`;
}

function guildSummary() {
  const id = guildId();
  const g = id && state.ready ? state.client.guilds.cache.get(id) : null;
  return g ? { id: g.id, name: g.name, icon: g.iconURL({ size: 128 }), members: g.memberCount } : null;
}

export const bot = {
  start,
  restart: async () => {
    await restart();
    return bot.status();
  },
  connect,
  setupLogs: async () => {
    if (!state.ready) throw new HttpError(503, 'bot_offline');
    const r = await logs.ensureChannels();
    if (!r.ok) throw new HttpError(400, r.error);
    return { ...r, logs: logs.status() };
  },
  postPanel: () => postPanel(),
  syncAll,
  syncOne,
  registerCommands,
  status() {
    return {
      configured: !!tokenOf(),
      token_source: config.discord.token ? 'env' : getInternal('discord_token') ? 'panel' : null,
      online: state.ready,
      error: state.error,
      user: state.ready ? { id: state.client.user.id, tag: state.client.user.tag, avatar: state.client.user.displayAvatarURL({ size: 128 }) } : null,
      guild: guildSummary(),
      guild_count: state.ready ? state.client.guilds.cache.size : 0,
      members_intent: membersIntentOn(),
      last_sync: state.lastSync,
      syncing: state.syncing,
      commands: state.commands,
      panel: { channel_id: getInternal('panel_channel_id'), message_id: getInternal('panel_message_id') },
      invite_url: inviteUrl(),
      logs: logs.status(),
    };
  },
  publicInfo() {
    const g = guildSummary();
    return { online: state.ready, guild: g ? { name: g.name, icon: g.icon, members: g.members } : null };
  },
};
