import { $, html, raw, render } from '../lib.js';
import { t } from '../i18n.js';
import { ICON, IMG, EMBLEM } from '../components.js';

const STEPS = [
  { title: 'reg_step1', sub: 'reg_step1_sub', body: 'reg_step1_body' },
  { title: 'reg_step2', sub: 'reg_step2_sub', body: 'reg_step2_body' },
  { title: 'reg_step3', sub: 'reg_step3_sub', body: 'reg_step3_body' },
  { title: 'reg_step4', sub: 'reg_step4_sub', body: 'reg_step4_body' },
];

function discordModalMock() {
  return html`
    <div class="dc-modal" dir="ltr">
      <div class="dc-head"><span class="icon">${ICON.bolt}</span><b>REINHARDT 1V1 — REGISTRATION</b></div>
      <div class="dc-body">
        <div class="dc-note">🛡️ بياناتك في ديسكورد تُسجّل تلقائياً · Your Discord profile is linked automatically.</div>
        <div><div class="dc-label">BattleTag <small>مثال · Example: Reinhardt#1234</small></div><div class="dc-input ph">Reinhardt#1234</div></div>
        <div><div class="dc-label">Current rank · الرانك الحالي</div><div class="dc-select">Select your rank</div></div>
        <div><div class="dc-label">Division · الديفيجن <small>تجاهلها لو Top 500 / Unranked</small></div><div class="dc-select">1 – 5</div></div>
        <div><div class="dc-label">Notes · ملاحظات <small>اختياري · Optional</small></div><div class="dc-input area ph">Peak rank, availability…</div></div>
      </div>
      <div class="dc-foot"><span class="dc-btn ghost">Cancel</span><span class="dc-btn">Submit</span></div>
    </div>`;
}

function reviewMock() {
  return html`
    <div class="dc-card" dir="ltr">
      <span class="bar"></span>
      <div class="in">
        <span>🟠 <b>NEW REGISTRATION · طلب تسجيل جديد</b></span>
        <span><b>BattleTag</b> Reinhardt#1234 · <b>Rank</b> Master 2</span>
        <span><b>Discord ID</b> 123456789012345678 · <b>Account created</b> 4 years ago</span>
        <span class="btns"><span class="ok">✅ ACCEPT • قبول</span><span class="no">✖️ REJECT • رفض</span></span>
      </div>
    </div>`;
}

export default {
  async mount(view, _params, ctx) {
    let step = 0;

    render(view, html`
      <div class="layout">
        <aside class="side" id="r-side"></aside>
        <section class="content" id="r-content"></section>
        <aside class="aside" id="r-aside"></aside>
      </div>`);
    const side = $('#r-side', view);
    const content = $('#r-content', view);
    const aside = $('#r-aside', view);

    const drawSide = () => render(side, STEPS.map((s, i) => html`
      <button class="side-btn ${step === i ? 'active' : ''}" style="--i:${i}" data-step="${i}">
        <span class="stack"><span>${String(i + 1).padStart(2, '0')} · ${t(s.title)}</span><small>${t(s.sub)}</small></span>
      </button>`));

    const drawContent = () => {
      const s = STEPS[step];
      const open = ctx.meta?.settings.registration_open;
      const showcase = step === 3 ? reviewMock() : discordModalMock();
      render(content, html`
        <div class="section">
          <div class="section-head">
            <h2 class="section-title">${t('reg_how')} · ${t(s.title)}</h2>
            <div class="section-tools"><span class="chip ${open ? 'completed' : 'rejected'}">${open ? t('reg_open') : t('reg_closed')}</span></div>
          </div>
          <div class="steps-body">
            <p class="lead">${raw(t(s.body))}</p>
            <div class="rows">
              <div class="row" style="--cols:3;--i:0"><div class="label">${t('auto_fields')}</div><div class="cell">ID</div><div class="cell">${t('username')}</div><div class="cell">AVATAR</div></div>
              <div class="row" style="--cols:3;--i:1"><div class="label">${t('battletag')} · ${t('rank')}</div><div class="cell">NAME#1234</div><div class="cell">TIER</div><div class="cell">DIV 1-5</div></div>
              <div class="row" style="--cols:3;--i:2"><div class="label">${t('starting_sr')}</div><div class="cell accent">${ctx.meta?.settings.starting_sr ?? 2500}</div><div class="cell empty">${t('empty')}</div><div class="cell empty">${t('empty')}</div></div>
            </div>
            <div class="section-head" style="margin-top:8px"><h3 class="section-title" style="font-size:18px">${step === 3 ? t('review_preview') : t('discord_preview')}</h3></div>
            ${showcase}
          </div>
        </div>`);
    };

    const drawAside = () => {
      const d = ctx.meta?.discord ?? {};
      const invite = ctx.meta?.settings.discord_invite;
      render(aside, html`
        <div class="hero-card">
          <div class="hero-art">
            <img class="bgimg" src="${IMG.charge}" alt="" referrerpolicy="no-referrer" data-fallback>
            <div class="fade"></div>
            ${d.guild?.icon ? html`<span class="av" style="--s:120px"><img src="${d.guild.icon}" alt="" data-fallback></span>` : html`<div class="three" data-3d="hammer">${EMBLEM}</div>`}
          </div>
          <div class="hero-name">${d.guild?.name ?? 'DISCORD'}</div>
          <div class="hero-sub">${d.guild ? `${d.guild.members} ${t('members')}` : ''} ${d.online ? '· ●' : ''}</div>
        </div>
        ${invite
          ? html`<a class="btn block" href="${invite}" target="_blank" rel="noopener">${ICON.discord}${t('join_discord')}</a>`
          : html`<div class="panel" style="text-align:center;color:var(--dim)">${t('no_invite')}</div>`}
        <div class="panel"><dl class="kv"><dt>${t('bot')}</dt><dd><span class="chip ${d.online ? 'completed' : 'rejected'}">${d.online ? t('bot_online') : t('bot_offline')}</span></dd></dl></div>`);
    };

    side.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-step]');
      if (!btn) return;
      step = Number(btn.dataset.step);
      drawSide();
      drawContent();
    });

    drawSide();
    drawContent();
    drawAside();
    return {
      refresh(batch) {
        if (batch.some((c) => c.scope === 'settings')) {
          drawContent();
          drawAside();
        }
      },
    };
  },
};
