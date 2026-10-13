import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, LabelBuilder, MediaGalleryBuilder,
  MessageFlags, ModalBuilder, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle, ThumbnailBuilder,
} from 'discord.js';
import { config } from '../config.js';
import { setting } from '../services/settings.js';
import { playerName } from '../services/players.js';

export const COLORS = {
  orange: 0xf46b1d,
  navy: 0x232c46,
  green: 0x3ecf8e,
  red: 0xe5484d,
  blue: 0x5aa9ff,
};

export const IMAGES = {
  banner: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/blt8215ad99f856a606/631a8b03636d390da7825ddb/1600_Reinhardt.jpg',
  charge: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/bltbd7b9ce27cbfccd3/6333cb5fe3c2a2741688caf9/REINHARDT_CHARGE.jpg',
  portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/551fbe070c16fdfcc17f7f1de63af22c53e7d2f1340fc2f3172441504527bc4e.png',
};

export const RANKS = {
  unranked: 'Unranked',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  champion: 'Champion',
  top500: 'Top 500',
};

export const rankLabel = (p) => `${RANKS[p.rank_tier] ?? 'Unranked'}${p.rank_division ? ` ${p.rank_division}` : ''}`;

export const ts = (iso, style = 'R') => (iso ? `<t:${Math.floor(new Date(iso).getTime() / 1000)}:${style}>` : '—');

/** reviewed_by is stored as "discord:<id>:<username>" or a plain label such as "web-admin". */
export function reviewerLabel(reviewedBy) {
  if (!reviewedBy) return '—';
  const m = /^discord:(\d+):/.exec(reviewedBy);
  return m ? `<@${m[1]}>` : `\`${reviewedBy}\``;
}

const v2 = (container, { ephemeral = false, rows = [] } = {}) => ({
  components: [container, ...rows],
  flags: MessageFlags.IsComponentsV2 | (ephemeral ? MessageFlags.Ephemeral : 0),
  allowedMentions: { parse: [] },
});

const text = (content) => new TextDisplayBuilder().setContent(content);
const sep = (big = false) => new SeparatorBuilder().setDivider(true).setSpacing(big ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
const siteUrl = (path = '') => (config.publicUrl ? `${config.publicUrl}${path}` : null);

/** A simple bilingual notice card. */
export function notice({ title, body, color = COLORS.orange, ephemeral = true }) {
  const c = new ContainerBuilder().setAccentColor(color).addTextDisplayComponents(text(`### ${title}\n${body}`));
  return v2(c, { ephemeral });
}

/* ---------------------------------------------------------------- registration panel */

export function panelMessage() {
  const open = setting('registration_open');
  const season = setting('season_name');
  const site = setting('site_name');

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('reg:open').setStyle(ButtonStyle.Primary).setLabel('REGISTER • تسجيل').setEmoji('🛡️').setDisabled(!open),
    new ButtonBuilder().setCustomId('reg:status').setStyle(ButtonStyle.Secondary).setLabel('MY STATUS • حالتي'),
  );
  const url = siteUrl('/');
  if (url) buttons.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel('LEADERBOARD'));

  const c = new ContainerBuilder()
    .setAccentColor(COLORS.orange)
    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems((i) => i.setURL(IMAGES.banner).setDescription('Reinhardt')))
    .addTextDisplayComponents(text(`# ${site}\n-# ${season} · REINHARDT 1V1 TOURNAMENT`))
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(text([
      open ? '### 🟢 التسجيل مفتوح — REGISTRATION OPEN' : '### 🔴 التسجيل مغلق — REGISTRATION CLOSED',
      'اضغط **REGISTER** واملأ النموذج. بياناتك في ديسكورد (الاسم، الصورة، الآيدي) تُسحب تلقائياً وتتحدث بشكل دوري.',
      'Press **REGISTER** and fill the form. Your Discord name, avatar and ID are linked automatically.',
      '',
      '> **BattleTag** · مثال `Reinhardt#1234`',
      '> **Rank** · الرانك الحالي + الديفيجن',
      '> **Notes** · اختياري (أعلى رانك، أوقات تواجدك…)',
      '',
      '-# بعد الإرسال ينتظر طلبك موافقة الإدارة · Your request is reviewed by the admins.',
    ].join('\n')));
  return v2(c, { rows: [buttons] });
}

/* ---------------------------------------------------------------- registration modal */

export function registrationModal(existing) {
  const tierOptions = Object.entries(RANKS).map(([value, label]) =>
    new StringSelectMenuOptionBuilder().setValue(value).setLabel(label).setDefault(existing?.rank_tier === value));
  const divisionOptions = [1, 2, 3, 4, 5].map((d) => {
    const option = new StringSelectMenuOptionBuilder().setValue(String(d)).setLabel(`Division ${d}`).setDefault(existing?.rank_division === d);
    if (d === 1) option.setDescription('الأعلى · highest');
    if (d === 5) option.setDescription('الأدنى · lowest');
    return option;
  });

  const battletag = new TextInputBuilder().setCustomId('battletag').setStyle(TextInputStyle.Short)
    .setPlaceholder('Reinhardt#1234').setMinLength(5).setMaxLength(32).setRequired(true);
  if (existing?.battletag) battletag.setValue(existing.battletag);

  const notes = new TextInputBuilder().setCustomId('notes').setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Peak rank, availability… / أعلى رانك، أوقات التواجد…').setMaxLength(300).setRequired(false);
  if (existing?.notes) notes.setValue(existing.notes.slice(0, 300));

  return new ModalBuilder()
    .setCustomId('reg:modal')
    .setTitle('REINHARDT 1V1 — REGISTRATION')
    .addTextDisplayComponents(text('-# 🛡️ بياناتك في ديسكورد تُسجّل تلقائياً · Your Discord profile is linked automatically.'))
    .addLabelComponents(
      new LabelBuilder().setLabel('BattleTag').setDescription('مثال · Example: Reinhardt#1234').setTextInputComponent(battletag),
      new LabelBuilder().setLabel('Current rank · الرانك الحالي').setStringSelectMenuComponent(
        new StringSelectMenuBuilder().setCustomId('rank_tier').setPlaceholder('Select your rank').setRequired(true).addOptions(tierOptions)),
      new LabelBuilder().setLabel('Division · الديفيجن').setDescription('تجاهلها لو Top 500 / Unranked').setStringSelectMenuComponent(
        new StringSelectMenuBuilder().setCustomId('rank_division').setPlaceholder('1 – 5').setRequired(false).setMinValues(0).setMaxValues(1).addOptions(divisionOptions)),
      new LabelBuilder().setLabel('Notes · ملاحظات').setDescription('اختياري · Optional').setTextInputComponent(notes),
    );
}

export function rejectReasonModal(playerId) {
  return new ModalBuilder()
    .setCustomId(`reg:rejectmodal:${playerId}`)
    .setTitle('REJECT REGISTRATION')
    .addLabelComponents(new LabelBuilder().setLabel('Reason · السبب').setDescription('يُرسل للاعب في الخاص · Sent to the player').setTextInputComponent(
      new TextInputBuilder().setCustomId('reason').setStyle(TextInputStyle.Paragraph).setMaxLength(300).setRequired(false)));
}

/* ---------------------------------------------------------------- review card */

const STATUS_STYLE = {
  pending: { color: COLORS.orange, title: '🟠 NEW REGISTRATION · طلب تسجيل جديد' },
  approved: { color: COLORS.green, title: '🟢 ACCEPTED · مقبول' },
  rejected: { color: COLORS.red, title: '🔴 REJECTED · مرفوض' },
  banned: { color: COLORS.red, title: '⛔ BANNED · محظور' },
};

export function reviewCard(p) {
  const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
  const head = new SectionBuilder()
    .addTextDisplayComponents(
      text(`### ${style.title}\n## ${playerName(p)}\n<@${p.discord_id}> · \`${p.username}\``),
      text(`**BattleTag** \`${p.battletag}\`\n**Rank** ${rankLabel(p)}`),
    )
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(p.avatar_url || IMAGES.portrait));

  const c = new ContainerBuilder().setAccentColor(style.color).addSectionComponents(head).addSeparatorComponents(sep())
    .addTextDisplayComponents(text([
      `**Discord ID** \`${p.discord_id}\``,
      `**Account created** ${ts(p.discord_created_at)}`,
      `**Joined server** ${ts(p.guild_joined_at)}`,
      p.notes ? `**Notes**\n>>> ${p.notes}` : null,
    ].filter(Boolean).join('\n')));

  if (p.status !== 'pending') {
    const line = p.status === 'approved'
      ? `✅ Accepted by ${reviewerLabel(p.reviewed_by)} ${ts(p.reviewed_at)} · Starting SR **${p.sr}**`
      : `❌ ${p.status === 'banned' ? 'Banned' : 'Rejected'} by ${reviewerLabel(p.reviewed_by)} ${ts(p.reviewed_at)}${p.reject_reason ? `\n> ${p.reject_reason}` : ''}`;
    c.addSeparatorComponents(sep()).addTextDisplayComponents(text(line));
  }
  c.addTextDisplayComponents(text(`-# Player #${p.id} · applied ${ts(p.applied_at || p.created_at)}`));

  const rows = [];
  if (p.status === 'pending') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`reg:accept:${p.id}`).setStyle(ButtonStyle.Success).setLabel('ACCEPT • قبول').setEmoji('✅'),
      new ButtonBuilder().setCustomId(`reg:reject:${p.id}`).setStyle(ButtonStyle.Danger).setLabel('REJECT • رفض').setEmoji('✖️'),
    ));
  }
  const admin = siteUrl('/admin');
  if (admin) {
    const link = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(admin).setLabel('ADMIN PANEL');
    if (rows[0]) rows[0].addComponents(link);
    else rows.push(new ActionRowBuilder().addComponents(link));
  }
  return v2(c, { rows });
}

export function profileUpdatedCard(p) {
  const c = new ContainerBuilder().setAccentColor(COLORS.blue).addSectionComponents(
    new SectionBuilder().addTextDisplayComponents(
      text(`### 🔵 PROFILE UPDATED · تحديث بيانات\n**${playerName(p)}** <@${p.discord_id}>`),
      text(`**BattleTag** \`${p.battletag}\` · **Rank** ${rankLabel(p)}`),
    ).setThumbnailAccessory(new ThumbnailBuilder().setURL(p.avatar_url || IMAGES.portrait)));
  return v2(c);
}

/* ---------------------------------------------------------------- DMs & public cards */

export function decisionDm(p) {
  const url = siteUrl('/');
  if (p.status === 'approved') {
    return notice({
      color: COLORS.green,
      ephemeral: false,
      title: '✅ تم قبول تسجيلك · Registration accepted',
      body: `أهلاً بك في **${setting('site_name')}**!\nWelcome to the Reinhardt 1v1 ladder.\n\n**SR** \`${p.sr}\` · **BattleTag** \`${p.battletag}\`${url ? `\n\n${url}` : ''}`,
    });
  }
  return notice({
    color: COLORS.red,
    ephemeral: false,
    title: '❌ تم رفض طلبك · Registration rejected',
    body: `${p.reject_reason ? `**السبب · Reason:** ${p.reject_reason}\n\n` : ''}تقدر تعدل بياناتك وتقدم مرة ثانية من زر التسجيل.\nYou can fix your details and apply again.`,
  });
}

export function statusCard(p) {
  if (!p) {
    return notice({ title: 'لست مسجلاً · Not registered', body: 'اضغط **REGISTER** للتسجيل في البطولة.\nPress **REGISTER** to join the tournament.' });
  }
  const map = {
    pending: ['🟠 طلبك قيد المراجعة · Pending review', 'سيتم الرد عليك قريباً. You will be notified by DM.'],
    approved: ['🟢 أنت مسجل · You are registered', `**SR** \`${p.sr}\` · **W/L** ${p.wins}/${p.losses} · **Rank** ${rankLabel(p)}`],
    rejected: ['🔴 تم رفض طلبك · Rejected', `${p.reject_reason ? `> ${p.reject_reason}\n` : ''}تقدر تقدم مرة ثانية · You may apply again.`],
    banned: ['⛔ محظور · Banned', 'تواصل مع الإدارة · Contact the admins.'],
  };
  const [title, body] = map[p.status] ?? map.pending;
  return notice({ title, body: `${body}\n-# BattleTag \`${p.battletag}\``, color: STATUS_STYLE[p.status]?.color ?? COLORS.orange });
}

export function profileCard(entry) {
  const c = new ContainerBuilder().setAccentColor(COLORS.orange).addSectionComponents(
    new SectionBuilder().addTextDisplayComponents(
      text(`-# #${entry.position} · ${setting('season_name')}\n## ${entry.name}`),
      text(`${entry.battletag ? `\`${entry.battletag}\` · ` : ''}${rankLabel(entry)}`),
      text(`**${entry.sr} SR**${entry.tier ? ` · Rank **${entry.tier.name}**` : ''} · ${entry.wins}W ${entry.losses}L${entry.winrate !== null ? ` · ${entry.winrate}%` : ''}${entry.form.length ? `\n${entry.form.map((r) => (r === 'W' ? '🟩' : '🟥')).join('')}` : ''}`),
    ).setThumbnailAccessory(new ThumbnailBuilder().setURL(entry.avatar || IMAGES.portrait)));
  const url = siteUrl(`/player/${entry.id}`);
  const rows = url ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel('VIEW PROFILE'))] : [];
  return v2(c, { rows });
}

export function leaderboardCard(entries) {
  const medal = ['🥇', '🥈', '🥉'];
  const lines = entries.slice(0, 10).map((e, i) =>
    `${medal[i] ?? `\`#${String(e.position).padStart(2, '0')}\``} **${e.name}** — \`${e.sr} SR\`${e.tier ? ` · ${e.tier.name}` : ''} · ${e.wins}W ${e.losses}L`);
  const c = new ContainerBuilder().setAccentColor(COLORS.orange)
    .addTextDisplayComponents(text(`## 🏆 SR LEADERBOARD\n-# ${setting('site_name')} · ${setting('season_name')}`))
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(text(lines.length ? lines.join('\n') : '_EMPTY_'));
  const url = siteUrl('/');
  const rows = url ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel('FULL LEADERBOARD'))] : [];
  return v2(c, { rows });
}

const ROUND_NAMES = { 1: 'FINAL', 2: 'SEMI-FINALS', 3: 'QUARTER-FINALS' };
export function roundName(round, size, format = 'single') {
  const k = Math.round(Math.log2(size));
  if (format === 'double') {
    if (round === 200) return 'GRAND FINAL';
    if (round > 100) {
      const L = round - 100;
      const last = 2 * (k - 1);
      if (L === last) return 'LOWER FINAL';
      if (L === last - 1) return 'LOWER SEMI-FINAL';
      return `LOWER ROUND ${L}`;
    }
    const fromEnd = k - round + 1;
    return `UPPER ${ROUND_NAMES[fromEnd] ?? `ROUND OF ${2 ** fromEnd}`}`;
  }
  const fromEnd = k - round + 1;
  return ROUND_NAMES[fromEnd] ?? `ROUND OF ${2 ** fromEnd}`;
}

export function resultCard(m, winner, loser) {
  const wScore = m.winner_id === m.player1_id ? m.score1 : m.score2;
  const lScore = m.winner_id === m.player1_id ? m.score2 : m.score1;
  const where = m.tournament_name ? `${m.tournament_name} · ${roundName(m.round, m.tournament_size, m.tournament_format)}` : 'SHOWMATCH';
  const c = new ContainerBuilder().setAccentColor(COLORS.orange).addSectionComponents(
    new SectionBuilder().addTextDisplayComponents(
      text(`-# ⚔️ ${where}\n## ${winner.name}  ${wScore} - ${lScore}  ${loser.name}`),
      text(m.applied ? `🟩 **${winner.name}** +${m.sr_gain} SR  ·  🟥 **${loser.name}** -${m.sr_loss} SR` : `🏆 **${winner.name}** advances`),
    ).setThumbnailAccessory(new ThumbnailBuilder().setURL(winner.avatar || IMAGES.portrait)));
  return v2(c);
}
