const en = {
  // navigation
  nav_leaderboard: 'Leaderboard', nav_tournaments: 'Tournaments', nav_matches: 'Matches', nav_register: 'Register', nav_admin: 'Admin',
  // common
  empty: 'Empty', tbd: 'TBD', loading: 'Loading', sr: 'SR', wins: 'Wins', losses: 'Losses', w: 'W', l: 'L', winrate: 'Win rate', wr: 'WR',
  games: 'Games', streak: 'Streak', titles: 'Titles', position: 'Position', player: 'Player', players: 'Players', rank: 'Rank', battletag: 'BattleTag',
  form: 'Form', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', close: 'Close', back: 'Back', search: 'Search', confirm: 'Confirm',
  yes: 'Yes', no: 'No', view_profile: 'View profile', live: 'Live', upcoming: 'Upcoming', completed: 'Completed', pending: 'Pending',
  approved: 'Approved', rejected: 'Rejected', banned: 'Banned', bye: 'BYE', vs: 'VS', none: 'None', all: 'All', saved: 'Saved', deleted: 'Deleted',
  on: 'On', off: 'Off', open: 'Open', closed: 'Closed', today: 'Today', unknown: 'Unknown', season: 'Season',
  error_generic: 'Something went wrong', updated_live: 'Updated live', just_now: 'just now',
  ago_m: '{n}m ago', ago_h: '{n}h ago', ago_d: '{n}d ago',
  hint_switch: 'Switch tab', hint_back: 'Back', hint_search: 'Search', hint_discord: 'Discord', hint_restore: 'Restore all defaults',
  sound_on: 'Sound on', sound_off: 'Sound off',
  // leaderboard
  lb_title: 'SR ladder', lb_cat_sr: 'SR Ladder', lb_cat_wins: 'Most wins', lb_cat_wr: 'Win rate', lb_cat_active: 'Most active',
  lb_cat_streak: 'Hot streak', lb_cat_titles: 'Champions', lb_cat_new: 'Newcomers', search_players: 'Search players…',
  no_players: 'No players yet', no_players_sub: 'Approved registrations appear here', min_games: 'min. {n} games', top3: 'Top 3',
  selected_player: 'Player card',
  // tournaments
  no_tournaments: 'No tournaments yet', no_tournaments_sub: 'The admins have not created a bracket',
  round_of: 'Round of {n}', quarterfinals: 'Quarter-finals', semifinals: 'Semi-finals', final: 'Final', champion: 'Champion',
  best_of: 'Best of {n}', bo: 'BO{n}', slots: 'Cells', starts: 'Starts', bracket: 'Bracket', info: 'Info', played: 'Played',
  sr_counts: 'Counts for SR', sr_no: 'Exhibition', winner_tbd: 'To be decided', status: 'Status', format: 'Format', size: 'Size',
  tournament: 'Tournament', tournaments: 'Tournaments',
  // matches
  recent_results: 'Recent results', live_now: 'Live now', all_matches: 'All matches', tournament_matches: 'Tournament',
  showmatches: 'Showmatches', showmatch: 'Showmatch', no_matches: 'No matches yet', when: 'When',
  // register
  reg_how: 'How to register', reg_step1: 'Join Discord', reg_step1_sub: 'Our server', reg_step2: 'Press register', reg_step2_sub: 'In #registration',
  reg_step3: 'Fill the form', reg_step3_sub: 'BattleTag & rank', reg_step4: 'Get approved', reg_step4_sub: 'By the admins',
  reg_step1_body: 'Registration happens <b>only through our Discord bot</b>. Join the server first — you do not need to connect or authorize anything.',
  reg_step2_body: 'Open the registration channel and press <b>REGISTER</b> on the bot panel (or type <b>/register</b>). A form opens right inside Discord.',
  reg_step3_body: 'Enter your <b>BattleTag</b>, current <b>rank</b> and division. Your Discord ID, username and avatar are taken automatically and kept up to date.',
  reg_step4_body: 'Admins accept or reject requests with one click. You get a DM with the decision and appear on the leaderboard with your starting SR.',
  join_discord: 'Join Discord', reg_open: 'Registration open', reg_closed: 'Registration closed', discord_preview: 'What you will see',
  auto_fields: 'Taken automatically', bot_online: 'Bot online', bot_offline: 'Bot offline', members: 'members', starting_sr: 'Starting SR',
  no_invite: 'Ask an admin for the Discord invite', review_preview: 'Admins review it like this',
  // profile
  sr_history: 'SR history', recent_matches: 'Recent matches', joined: 'Joined', no_matches_yet: 'No matches played yet', profile: 'Profile',
  // admin
  admin_login: 'Admin access', password: 'Password', login: 'Login', logout: 'Logout', wrong_password: 'Wrong password',
  too_many_attempts: 'Too many attempts — wait a few minutes', admin_password_not_set: 'Set ADMIN_PASSWORD in .env first',
  a_overview: 'Overview', a_registrations: 'Registrations', a_players: 'Players', a_tournaments: 'Tournaments', a_matches: 'Matches',
  a_settings: 'Settings', a_discord: 'Discord', a_log: 'Activity log',
  accept: 'Accept', reject: 'Reject', reject_reason: 'Reason (sent to the player)', add_player: 'Add player', edit_player: 'Edit player',
  delete_player_q: 'Delete {name}? Their match history stays, but they leave the leaderboard.', create_tournament: 'Create tournament',
  edit_tournament: 'Tournament settings', seed_players: 'Seed players', seed_by_sr: 'By SR', seed_random: 'Random', seed_order: 'Pick order',
  seed_now: 'Place in bracket', byes: 'Auto-advance byes', reset_results: 'Reset results', delete_tournament: 'Delete tournament',
  delete_tournament_q: 'Delete "{name}"? SR from its matches is reverted.', reset_q: 'Reset every result in "{name}"? SR is reverted.',
  resize_q: 'Change bracket to {n} cells? Results reset; seeded players are kept.', reseed_q: 'Re-seed the bracket? All results in it reset.',
  match_editor: 'Match', winner: 'Winner', score: 'Score', sr_gain: 'Winner +SR', sr_loss: 'Loser −SR', auto: 'Auto', note: 'Note',
  clear_result: 'Clear result', new_showmatch: 'New showmatch', no_winner: 'No winner yet', player1: 'Player 1', player2: 'Player 2',
  post_panel: 'Post registration panel', sync_now: 'Sync profiles now', register_commands: 'Re-register commands', invite_bot: 'Invite bot',
  online: 'Online', offline: 'Offline', not_configured: 'Not configured', restore_defaults: 'Restore defaults', restore_q: 'Restore every setting to its default?',
  pending_count: '{n} pending', select_players: 'Select players ({n}/{max})', name: 'Name', description: 'Description', date: 'Date',
  discord_id: 'Discord ID', username: 'Username', display_name: 'Display name', notes: 'Notes', applied: 'Applied', reviewed: 'Reviewed',
  nothing_pending: 'No pending registrations', sync: 'Sync', last_sync: 'Last sync', commands: 'Commands', server: 'Server', bot: 'Bot',
  setup_guide: 'Setup checklist', actions: 'Actions', created: 'Created', time: 'Time', actor: 'By', action: 'Action',
  in_guild: 'In server', left_guild: 'Left server', all_statuses: 'All', match_saved: 'Match saved', result_cleared: 'Result cleared',
  players_seeded: 'Players placed', tournament_created: 'Tournament created', cells_changed: 'Bracket resized', panel_posted: 'Panel posted',
  sync_done: 'Sync finished: {u} updated of {c}', open_bracket: 'Open bracket', edit_bracket_hint: 'Click a match to set players, scores, winner and SR.',
  sr_preview: 'Suggested', delete_match_q: 'Delete this showmatch? SR is reverted.',
  // settings
  s_general: 'General', s_points: 'Points (SR)', s_registration: 'Registration', s_discord: 'Discord channels & roles',
  s_site_name: 'Site name', s_season_name: 'Season', s_default_lang: 'Default language', s_starting_sr: 'Starting SR',
  s_points_mode: 'Points mode', s_elo: 'Elo (auto)', s_fixed: 'Fixed', s_elo_k: 'Elo K-factor', s_fixed_win: 'Fixed win points',
  s_fixed_loss: 'Fixed loss points', s_min_sr: 'Minimum SR', s_registration_open: 'Registration', s_show_battletags: 'Show BattleTags publicly',
  s_discord_invite: 'Discord invite link', s_guild_id: 'Server (guild) ID', s_registration_channel_id: 'Registration channel ID',
  s_review_channel_id: 'Review channel ID (accept / reject)', s_results_channel_id: 'Results channel ID', s_player_role_id: 'Player role ID (given on accept)',
  s_admin_role_id: 'Reviewer role ID', s_announce_results: 'Post match results', s_dm_players: 'DM players the decision',
  s_sync_interval_min: 'Profile sync every (minutes)',
  // errors from the API
  e_invalid_battletag: 'Invalid BattleTag (Name#1234)', e_same_player: 'Pick two different players', e_winner_not_in_match: 'Winner must be in the match',
  e_too_many_players: 'Too many players for this bracket', e_bot_offline: 'The Discord bot is offline', e_registration_channel_missing: 'Set the registration channel ID first',
  e_invalid_discord_id: 'Invalid Discord ID', e_name_required: 'Name is required', e_discord_id_taken: 'That Discord ID is already used',
  e_two_players_required: 'Pick two players', e_bracket_match_use_clear: 'Bracket matches can only be cleared', e_unauthorized: 'Session expired — log in again',
  e_battletag_taken: 'BattleTag already registered', e_already_approved: 'Already approved', e_already_rejected: 'Already rejected', e_no_discord_id: 'This player has no Discord ID',
  // ranks & points
  rank_spec_title: 'Rank specification & formula', rank_word: 'Rank {name}', sr_bounds: 'SR bounds', per_round: 'Points per round',
  per_round_won: 'per round won', per_round_lost: 'per round lost', example_calc: 'Example match & SR calculation', match_score: 'Match score',
  if_you_lose: 'If you lose', formula_note: 'Ranks are taken from before the match. The winner always gains at least 1 SR; the loser never gains.',
  all_ranks: 'All ranks', ranks_btn: 'Ranks & points', s_rank_mode: 'By rank', upper_round: 'Upper round {n}', s_points_divisor: 'Divide raw points by',
  rank_table: 'Rank table', add_rank: 'Add rank', save_table: 'Save table', restore_table: 'Default table', new_rank: 'New',
  restore_table_q: 'Replace the table with the default ranks? (Saved only when you press Save table.)',
  rank_name: 'Name', rank_min: 'From SR', rank_win: '+ base win', rank_loss: '− base loss', color: 'Colour',
  calculator: 'Calculator', calculator_sub: 'Try the current table', loser: 'Loser', enter_score_hint: 'Enter the round score to calculate the points',
  rank_formula_help: 'Winner gains: their rank\'s base win × score dominance × rank gap. Loser loses: their rank\'s base loss × the same factors. Points already given are not recalculated when you change these values.',
  points_moved: 'Points settings moved to the new section',
  // brackets
  bracket_type: 'Bracket', format_single: 'Single elimination', format_double: 'Double elimination (lower bracket)',
  format_double_hint: 'Lose twice to be out', format_q: 'Change the bracket type? The bracket is rebuilt and all results in it are cleared (players stay seeded).',
  upper_bracket: 'Upper bracket', upper_bracket_sub: 'Lose here and you drop to the lower bracket',
  lower_bracket: 'Lower bracket', lower_bracket_sub: 'Lose here and you are out', grand_final: 'Grand final', grand_final_sub: 'Upper winner vs lower winner',
  upper_final: 'Upper final', upper_semifinals: 'Upper semi-finals', upper_short: 'Upper', lower_final: 'Lower final',
  lower_semifinal: 'Lower semi-final', lower_round: 'Lower round {n}', loser_of: 'Loser of R{r} #{n}', loser_short: 'Loser R{r}·{n}', round_n: 'Round {n}',
  // admin additions
  a_ranks: 'Ranks & points', a_content: 'Site content', a_admins: 'Admins', username_hint: 'Leave empty for the owner password',
  signed_in_as: 'Signed in as', role: 'Role', role_owner: 'Owner', role_admin: 'Admin', role_moderator: 'Moderator',
  role_owner_help: 'everything, including admin accounts.', role_admin_help: 'everything except admin accounts.',
  role_moderator_help: 'review registrations, enter match results and seed brackets.',
  admins_help: 'The owner signs in with an empty username and the password from .env. Add accounts for your team below; changing a role or password signs that account out.',
  add_admin: 'Add admin', change_password: 'Password', new_password: 'New password (min. 8 characters)', last_login: 'Last login', by: 'by',
  delete_admin_q: 'Delete the admin account "{name}"?',
  sr_tools: 'SR tools', reason: 'Reason', apply_sr: 'Apply', reset_stats: 'Reset stats', match: 'Match',
  reset_stats_q: 'Reset {name} to the starting SR with 0 wins and 0 losses?', avatar_url: 'Avatar image URL',
  announcement: 'Announcement bar', announcement_sub: 'Shown at the top of every page',
  s_announcement_on: 'Show announcement', s_announcement_en: 'Text (English)', s_announcement_ar: 'Text (Arabic)',
  images: 'Images', images_sub: 'Paste image links (https://…). Empty = built-in image',
  s_img_banner: 'Main banner', s_img_card: 'Player card background', s_img_covers: 'Tournament covers (one link per line)',
  site_texts: 'Site texts', search_texts: 'Search texts…', text_key: 'Key', n_changed: '{n} changed', more_results: '{n} more — refine the search',
  site_texts_help: 'Type a new text to replace any wording on the site. Leave a box empty to keep the original (shown in grey).',
  e_forbidden: 'Your role is not allowed to do this', e_password_too_short: 'Password must be at least 8 characters',
  e_password_too_long: 'Password is too long', e_invalid_username: 'Username: 3–32 letters, numbers, . _ -',
  e_username_taken: 'That username is taken', e_invalid_rank_table: 'Invalid rank table', e_duplicate_rank_min: 'Two ranks start at the same SR',
  e_too_many_ranks: 'Maximum 30 ranks', e_invalid_url: 'Links must start with https://', e_admin_not_found: 'Admin not found',
  base_rates: 'Base rates', base_win: 'base win', base_loss: 'base loss', how_points_work: 'How points are calculated',
  rule_base: 'Your rank', rule_base_sub: 'sets the base points (higher ranks win less and lose more).',
  rule_dominance: 'The score', rule_dominance_sub: '— a crushing win moves more points than a close one (10-0 = ×2, 10-9 ≈ ×1.05).',
  rule_gap: 'The rank gap', rule_gap_sub: '— beating a higher rank gives a lot more, beating a lower rank gives little. The loser loses with the same factors.',
  ex_same: 'Same rank, 10 - 4', ex_upset: 'You beat a {name} 10 - 4 (upset)', ex_upset_against: 'A {name} beats you 10 - 4',
  you_gain: 'You gain', you_lose: 'You lose',
  s_dominance_pct: 'Score dominance weight (%)', s_gap_pct: 'Rank gap factor (%, 140 = ×1.4 per rank)',
  calc_legend: 'base × score dominance × rank gap', reset_all_sr: 'Reset every player to the starting SR',
  reset_all_sr_q: 'Set every approved player back to {n} SR? Wins, losses and match history stay. Use this when starting a new season.',
  reset_all_done: '{n} players reset',
  theme_dark: 'Dark mode', theme_light: 'Light mode',
  dc_connect_title: 'Connect the Discord bot', bot_token: 'Bot token', members_intent: 'Server Members intent',
  dc_connect: 'Connect', dc_reconnect: 'Save & reconnect', dc_disconnect: 'Disconnect', dc_token_saved: 'Saved — paste a new one to replace it',
  dc_token_env: 'The bot token is set in the .env file (DISCORD_TOKEN). Remove it there to manage it from here.',
  dc_disconnect_q: 'Remove the saved bot token and take the bot offline?', dc_connecting: 'Connecting to Discord…', dc_connected: 'Bot online as {tag}',
  dc_step1: 'Open the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">Discord Developer Portal</a> → <b>New Application</b> (give it the tournament\'s name).',
  dc_step2: 'In the Bot tab press Reset Token, copy it and paste it above, then press Connect.',
  dc_step3: 'Optional: in the Bot tab enable "Server Members Intent" and switch it on above — names and avatars then update instantly.',
  dc_step4: 'Invite the bot to your server:',
  dc_step5: 'In Discord turn on Developer Mode (User Settings → Advanced), right-click your server and channels → Copy ID, and paste them below (registration, review and results channels, player role).',
  dc_step6: 'Press "Post registration panel". Players press REGISTER in Discord, you get ACCEPT / REJECT in the review channel, and accepted players appear on the site automatically.',
  e_invalid_bot_token: 'That does not look like a bot token — copy it again from the Developer Portal', e_token_in_env: 'The token is set in .env — change it there',
  dc_logs: 'Log channels', dc_logs_sub: 'Everything that happens on the site, posted to Discord',
  create_log_channels: 'Create / check channels', s_log_enabled: 'Post the activity log to Discord', s_log_category_id: 'Category ID for the log channels',
  dc_log_pending: 'Created automatically when the bot is online',
  dc_logs_help: 'The bot creates one channel per kind of activity inside this category (registrations, players, matches, tournaments, settings, admins, system) and posts every action there. It needs the "Manage Channels" permission — re-invite it with the button above or give its role that permission. If a channel is deleted, it is created again.',
  logs_ready: 'Log channels ready ({n} created)', e_category_not_found: 'The bot cannot see that category — check the ID and that the bot is in that server',
  e_missing_manage_channels: 'The bot needs the "Manage Channels" permission on that category',
  s_log_lang: 'Log language',
  demo_data: 'Demo data', demo_count: '{p} players · {t} tournaments',
  demo_data_help: 'Removes only the demo players, demo registrations and demo tournaments created by "npm run seed". Real players from Discord and everything you created stay. A backup copy of the database is saved first (data folder).',
  demo_remove: 'Remove demo data', demo_remove_q: 'Remove all demo players and demo tournaments? Real players are kept and a backup is saved first.',
  demo_removed: 'Removed {p} demo players and {t} demo tournaments',
};

const ar = {
  nav_leaderboard: 'الترتيب', nav_tournaments: 'البطولات', nav_matches: 'المباريات', nav_register: 'التسجيل', nav_admin: 'الإدارة',
  empty: 'فارغ', tbd: 'بانتظار', loading: 'جاري التحميل', sr: 'SR', wins: 'فوز', losses: 'خسارة', w: 'ف', l: 'خ', winrate: 'نسبة الفوز', wr: '٪',
  games: 'مباريات', streak: 'السلسلة', titles: 'البطولات', position: 'المركز', player: 'اللاعب', players: 'اللاعبين', rank: 'الرانك', battletag: 'BattleTag',
  form: 'آخر النتائج', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', close: 'إغلاق', back: 'رجوع', search: 'بحث', confirm: 'تأكيد',
  yes: 'نعم', no: 'لا', view_profile: 'عرض الملف', live: 'مباشر', upcoming: 'قادمة', completed: 'منتهية', pending: 'قيد المراجعة',
  approved: 'مقبول', rejected: 'مرفوض', banned: 'محظور', bye: 'تأهل مباشر', vs: 'ضد', none: 'لا يوجد', all: 'الكل', saved: 'تم الحفظ', deleted: 'تم الحذف',
  on: 'تشغيل', off: 'إيقاف', open: 'مفتوح', closed: 'مغلق', today: 'اليوم', unknown: 'غير معروف', season: 'الموسم',
  error_generic: 'حدث خطأ', updated_live: 'تحديث مباشر', just_now: 'الآن',
  ago_m: 'قبل {n} د', ago_h: 'قبل {n} س', ago_d: 'قبل {n} يوم',
  hint_switch: 'تبديل', hint_back: 'رجوع', hint_search: 'بحث', hint_discord: 'ديسكورد', hint_restore: 'استعادة الافتراضي',
  sound_on: 'الصوت يعمل', sound_off: 'الصوت مغلق',
  lb_title: 'ترتيب SR', lb_cat_sr: 'ترتيب SR', lb_cat_wins: 'الأكثر فوزاً', lb_cat_wr: 'نسبة الفوز', lb_cat_active: 'الأكثر نشاطاً',
  lb_cat_streak: 'سلسلة انتصارات', lb_cat_titles: 'الأبطال', lb_cat_new: 'الجدد', search_players: 'ابحث عن لاعب…',
  no_players: 'لا يوجد لاعبين بعد', no_players_sub: 'اللاعبين المقبولين يظهرون هنا', min_games: '{n} مباريات على الأقل', top3: 'أفضل 3',
  selected_player: 'بطاقة اللاعب',
  no_tournaments: 'لا توجد بطولات', no_tournaments_sub: 'لم تنشئ الإدارة أي بطولة بعد',
  round_of: 'دور الـ {n}', quarterfinals: 'ربع النهائي', semifinals: 'نصف النهائي', final: 'النهائي', champion: 'البطل',
  best_of: 'أفضل من {n}', bo: 'BO{n}', slots: 'الخلايا', starts: 'البداية', bracket: 'الشجرة', info: 'معلومات', played: 'لُعبت',
  sr_counts: 'تحتسب SR', sr_no: 'ودية', winner_tbd: 'لم يُحسم', status: 'الحالة', format: 'النظام', size: 'الحجم',
  tournament: 'بطولة', tournaments: 'البطولات',
  recent_results: 'آخر النتائج', live_now: 'مباشر الآن', all_matches: 'كل المباريات', tournament_matches: 'البطولات',
  showmatches: 'مباريات ودية', showmatch: 'ودية', no_matches: 'لا توجد مباريات', when: 'الوقت',
  reg_how: 'طريقة التسجيل', reg_step1: 'ادخل الديسكورد', reg_step1_sub: 'سيرفرنا', reg_step2: 'اضغط تسجيل', reg_step2_sub: 'في روم التسجيل',
  reg_step3: 'عبّي النموذج', reg_step3_sub: 'BattleTag والرانك', reg_step4: 'انتظر القبول', reg_step4_sub: 'من الإدارة',
  reg_step1_body: 'التسجيل يتم <b>فقط عن طريق بوت الديسكورد</b>. ادخل السيرفر أولاً — ما تحتاج تربط حسابك أو تعطي أي صلاحيات.',
  reg_step2_body: 'افتح روم التسجيل واضغط زر <b>REGISTER</b> في رسالة البوت (أو اكتب <b>/register</b>). بيفتح لك نموذج داخل الديسكورد.',
  reg_step3_body: 'اكتب <b>BattleTag</b> و<b>الرانك</b> والديفيجن. الآيدي واليوزر والصورة تنسحب تلقائياً وتتحدث بشكل دوري لو غيرتها.',
  reg_step4_body: 'الإدارة تقبل أو ترفض بضغطة زر. يوصلك رد في الخاص وتظهر في الترتيب بنقاط البداية.',
  join_discord: 'ادخل الديسكورد', reg_open: 'التسجيل مفتوح', reg_closed: 'التسجيل مغلق', discord_preview: 'هذا اللي بيظهر لك',
  auto_fields: 'يُسحب تلقائياً', bot_online: 'البوت متصل', bot_offline: 'البوت غير متصل', members: 'عضو', starting_sr: 'نقاط البداية',
  no_invite: 'اطلب رابط الديسكورد من الإدارة', review_preview: 'وهكذا تراجعه الإدارة',
  sr_history: 'تاريخ SR', recent_matches: 'آخر المباريات', joined: 'انضم', no_matches_yet: 'لم يلعب أي مباراة بعد', profile: 'الملف',
  admin_login: 'دخول الإدارة', password: 'كلمة المرور', login: 'دخول', logout: 'خروج', wrong_password: 'كلمة المرور خاطئة',
  too_many_attempts: 'محاولات كثيرة — انتظر دقائق', admin_password_not_set: 'حدد ADMIN_PASSWORD في ملف .env',
  a_overview: 'نظرة عامة', a_registrations: 'طلبات التسجيل', a_players: 'اللاعبين', a_tournaments: 'البطولات', a_matches: 'المباريات',
  a_settings: 'الإعدادات', a_discord: 'ديسكورد', a_log: 'سجل النشاط',
  accept: 'قبول', reject: 'رفض', reject_reason: 'السبب (يُرسل للاعب)', add_player: 'إضافة لاعب', edit_player: 'تعديل لاعب',
  delete_player_q: 'حذف {name}؟ تبقى مبارياته لكن يختفي من الترتيب.', create_tournament: 'إنشاء بطولة',
  edit_tournament: 'إعدادات البطولة', seed_players: 'توزيع اللاعبين', seed_by_sr: 'حسب SR', seed_random: 'عشوائي', seed_order: 'حسب الاختيار',
  seed_now: 'وزّعهم في الشجرة', byes: 'تأهيل الفارغ تلقائياً', reset_results: 'تصفير النتائج', delete_tournament: 'حذف البطولة',
  delete_tournament_q: 'حذف "{name}"؟ نقاط مبارياتها تُسترجع.', reset_q: 'تصفير كل نتائج "{name}"؟ النقاط تُسترجع.',
  resize_q: 'تغيير الشجرة إلى {n} خلية؟ النتائج تتصفر ويبقى اللاعبين.', reseed_q: 'إعادة التوزيع؟ كل النتائج فيها تتصفر.',
  match_editor: 'المباراة', winner: 'الفائز', score: 'النتيجة', sr_gain: '+SR للفائز', sr_loss: '−SR للخاسر', auto: 'تلقائي', note: 'ملاحظة',
  clear_result: 'مسح النتيجة', new_showmatch: 'مباراة ودية جديدة', no_winner: 'بدون فائز', player1: 'اللاعب 1', player2: 'اللاعب 2',
  post_panel: 'نشر لوحة التسجيل', sync_now: 'مزامنة الملفات الآن', register_commands: 'إعادة تسجيل الأوامر', invite_bot: 'إضافة البوت',
  online: 'متصل', offline: 'غير متصل', not_configured: 'غير مُعد', restore_defaults: 'استعادة الافتراضي', restore_q: 'استعادة كل الإعدادات للوضع الافتراضي؟',
  pending_count: '{n} قيد المراجعة', select_players: 'اختر اللاعبين ({n}/{max})', name: 'الاسم', description: 'الوصف', date: 'التاريخ',
  discord_id: 'آيدي ديسكورد', username: 'اليوزر', display_name: 'الاسم الظاهر', notes: 'ملاحظات', applied: 'تاريخ الطلب', reviewed: 'روجع',
  nothing_pending: 'لا توجد طلبات معلقة', sync: 'مزامنة', last_sync: 'آخر مزامنة', commands: 'الأوامر', server: 'السيرفر', bot: 'البوت',
  setup_guide: 'خطوات الإعداد', actions: 'إجراءات', created: 'أُنشئ', time: 'الوقت', actor: 'بواسطة', action: 'الإجراء',
  in_guild: 'في السيرفر', left_guild: 'خرج من السيرفر', all_statuses: 'الكل', match_saved: 'تم حفظ المباراة', result_cleared: 'تم مسح النتيجة',
  players_seeded: 'تم توزيع اللاعبين', tournament_created: 'تم إنشاء البطولة', cells_changed: 'تم تغيير حجم الشجرة', panel_posted: 'تم نشر اللوحة',
  sync_done: 'انتهت المزامنة: {u} تحديث من {c}', open_bracket: 'فتح الشجرة', edit_bracket_hint: 'اضغط على أي مباراة لتحديد اللاعبين والنتيجة والفائز والنقاط.',
  sr_preview: 'المقترح', delete_match_q: 'حذف هذه المباراة الودية؟ النقاط تُسترجع.',
  s_general: 'عام', s_points: 'النقاط (SR)', s_registration: 'التسجيل', s_discord: 'رومات ورتب الديسكورد',
  s_site_name: 'اسم الموقع', s_season_name: 'الموسم', s_default_lang: 'اللغة الافتراضية', s_starting_sr: 'نقاط البداية',
  s_points_mode: 'طريقة النقاط', s_elo: 'Elo (تلقائي)', s_fixed: 'ثابت', s_elo_k: 'معامل K', s_fixed_win: 'نقاط الفوز الثابتة',
  s_fixed_loss: 'نقاط الخسارة الثابتة', s_min_sr: 'أقل SR ممكن', s_registration_open: 'التسجيل', s_show_battletags: 'إظهار BattleTag للجميع',
  s_discord_invite: 'رابط الديسكورد', s_guild_id: 'آيدي السيرفر', s_registration_channel_id: 'آيدي روم التسجيل',
  s_review_channel_id: 'آيدي روم المراجعة (قبول / رفض)', s_results_channel_id: 'آيدي روم النتائج', s_player_role_id: 'آيدي رتبة اللاعب (عند القبول)',
  s_admin_role_id: 'آيدي رتبة المراجعين', s_announce_results: 'نشر نتائج المباريات', s_dm_players: 'إرسال القرار للاعب في الخاص',
  s_sync_interval_min: 'مزامنة الملفات كل (دقيقة)',
  e_invalid_battletag: 'BattleTag غير صحيح (Name#1234)', e_same_player: 'اختر لاعبين مختلفين', e_winner_not_in_match: 'الفائز لازم يكون من لاعبي المباراة',
  e_too_many_players: 'عدد اللاعبين أكبر من الشجرة', e_bot_offline: 'بوت الديسكورد غير متصل', e_registration_channel_missing: 'حدد آيدي روم التسجيل أولاً',
  e_invalid_discord_id: 'آيدي ديسكورد غير صحيح', e_name_required: 'الاسم مطلوب', e_discord_id_taken: 'آيدي الديسكورد مستخدم',
  e_two_players_required: 'اختر لاعبين', e_bracket_match_use_clear: 'مباريات الشجرة تُمسح فقط', e_unauthorized: 'انتهت الجلسة — سجل دخول من جديد',
  e_battletag_taken: 'BattleTag مسجل مسبقاً', e_already_approved: 'مقبول مسبقاً', e_already_rejected: 'مرفوض مسبقاً', e_no_discord_id: 'هذا اللاعب بدون آيدي ديسكورد',
  rank_spec_title: 'تفاصيل الرانك وطريقة الحساب', rank_word: 'رانك {name}', sr_bounds: 'حدود النقاط', per_round: 'النقاط لكل راوند',
  per_round_won: 'لكل راوند فوز', per_round_lost: 'لكل راوند خسارة', example_calc: 'مثال مباراة وحساب النقاط', match_score: 'نتيجة المباراة',
  if_you_lose: 'لو خسرت', formula_note: 'الرانك ينحسب من قبل المباراة. الفائز يكسب نقطة على الأقل، والخاسر ما يكسب أبداً.',
  all_ranks: 'كل الرانكات', ranks_btn: 'الرانكات والنقاط', s_rank_mode: 'حسب الرانك', upper_round: 'العليا - الجولة {n}', s_points_divisor: 'قسمة النقاط الخام على',
  rank_table: 'جدول الرانكات', add_rank: 'إضافة رانك', save_table: 'حفظ الجدول', restore_table: 'الجدول الافتراضي', new_rank: 'جديد',
  restore_table_q: 'استبدال الجدول بالرانكات الافتراضية؟ (ما ينحفظ إلا لما تضغط حفظ الجدول)',
  rank_name: 'الاسم', rank_min: 'من SR', rank_win: '+ فوز أساسي', rank_loss: '− خسارة أساسية', color: 'اللون',
  calculator: 'الحاسبة', calculator_sub: 'جرّب الجدول الحالي', loser: 'الخاسر', enter_score_hint: 'اكتب نتيجة الراوندات عشان تنحسب النقاط',
  rank_formula_help: 'الفائز يكسب: فوز رانكه الأساسي × تأثير النتيجة × فرق الرانك. الخاسر ينقص: خسارة رانكه الأساسية × نفس التأثيرات. النقاط اللي انعطت سابقاً ما تنحسب من جديد لو غيرت القيم.',
  points_moved: 'إعدادات النقاط انتقلت للقسم الجديد',
  bracket_type: 'نوع الشجرة', format_single: 'خروج المغلوب', format_double: 'خروج مزدوج (لوَر براكت)',
  format_double_hint: 'تطلع بعد خسارتين', format_q: 'تغيير نوع الشجرة؟ الشجرة تنبني من جديد وتنمسح نتائجها (اللاعبين يبقون).',
  upper_bracket: 'الشجرة العليا', upper_bracket_sub: 'اللي يخسر هنا ينزل للشجرة السفلى',
  lower_bracket: 'الشجرة السفلى (لوَر)', lower_bracket_sub: 'اللي يخسر هنا يطلع', grand_final: 'النهائي الكبير', grand_final_sub: 'بطل العليا ضد بطل السفلى',
  upper_final: 'نهائي العليا', upper_semifinals: 'نصف نهائي العليا', upper_short: 'العليا', lower_final: 'نهائي السفلى',
  lower_semifinal: 'نصف نهائي السفلى', lower_round: 'السفلى - الجولة {n}', loser_of: 'خاسر ج{r} #{n}', loser_short: 'خاسر ج{r}·{n}', round_n: 'الجولة {n}',
  a_ranks: 'الرانكات والنقاط', a_content: 'محتوى الموقع', a_admins: 'المشرفين', username_hint: 'اتركه فاضي لكلمة مرور المالك',
  signed_in_as: 'مسجل باسم', role: 'الصلاحية', role_owner: 'مالك', role_admin: 'أدمن', role_moderator: 'مشرف',
  role_owner_help: 'كل شي، ومعه إدارة حسابات المشرفين.', role_admin_help: 'كل شي ما عدا حسابات المشرفين.',
  role_moderator_help: 'مراجعة التسجيلات، إدخال النتائج، وتوزيع اللاعبين بالشجرة.',
  admins_help: 'المالك يدخل باسم مستخدم فاضي وكلمة المرور اللي في .env. أضف حسابات لفريقك تحت؛ تغيير الصلاحية أو كلمة المرور يطلع الحساب من جلسته.',
  add_admin: 'إضافة مشرف', change_password: 'كلمة المرور', new_password: 'كلمة مرور جديدة (8 أحرف على الأقل)', last_login: 'آخر دخول', by: 'بواسطة',
  delete_admin_q: 'حذف حساب المشرف "{name}"؟',
  sr_tools: 'أدوات النقاط', reason: 'السبب', apply_sr: 'تطبيق', reset_stats: 'تصفير الإحصائيات', match: 'مباراة',
  reset_stats_q: 'ترجيع {name} لنقاط البداية مع 0 فوز و 0 خسارة؟', avatar_url: 'رابط صورة اللاعب',
  announcement: 'شريط الإعلان', announcement_sub: 'يظهر أعلى كل الصفحات',
  s_announcement_on: 'إظهار الإعلان', s_announcement_en: 'النص (إنجليزي)', s_announcement_ar: 'النص (عربي)',
  images: 'الصور', images_sub: 'الصق روابط صور (https://…). فاضي = الصورة الأصلية',
  s_img_banner: 'البانر الرئيسي', s_img_card: 'خلفية بطاقة اللاعب', s_img_covers: 'أغلفة البطولات (رابط بكل سطر)',
  site_texts: 'نصوص الموقع', search_texts: 'ابحث في النصوص…', text_key: 'المفتاح', n_changed: '{n} متغير', more_results: '{n} زيادة — حدد البحث أكثر',
  site_texts_help: 'اكتب نص جديد بدل أي كلام في الموقع. اترك الخانة فاضية عشان يبقى الأصلي (المكتوب بالرمادي).',
  e_forbidden: 'صلاحيتك ما تسمح بهذا', e_password_too_short: 'كلمة المرور لازم 8 أحرف على الأقل',
  e_password_too_long: 'كلمة المرور طويلة', e_invalid_username: 'اسم المستخدم: 3–32 حرف أو رقم أو . _ -',
  e_username_taken: 'اسم المستخدم مستخدم', e_invalid_rank_table: 'جدول الرانكات غير صحيح', e_duplicate_rank_min: 'رانكين يبدؤون من نفس النقاط',
  e_too_many_ranks: 'الحد 30 رانك', e_invalid_url: 'الروابط لازم تبدأ بـ https://', e_admin_not_found: 'المشرف غير موجود',
  base_rates: 'النقاط الأساسية', base_win: 'فوز', base_loss: 'خسارة', how_points_work: 'كيف تنحسب النقاط',
  rule_base: 'رانكك', rule_base_sub: 'يحدد النقاط الأساسية (الرانك الأعلى يكسب أقل ويخسر أكثر).',
  rule_dominance: 'النتيجة', rule_dominance_sub: '— الفوز الساحق يحرك نقاط أكثر من الفوز المتقارب (10-0 = ×2، 10-9 ≈ ×1.05).',
  rule_gap: 'فرق الرانك', rule_gap_sub: '— لو فزت على رانك أعلى منك تكسب كثير، ولو فزت على رانك أقل تكسب قليل. والخاسر ينقص بنفس النسبة.',
  ex_same: 'نفس الرانك، 10 - 4', ex_upset: 'فزت على {name} بنتيجة 10 - 4', ex_upset_against: 'لاعب {name} فاز عليك 10 - 4',
  you_gain: 'تكسب', you_lose: 'تخسر',
  s_dominance_pct: 'تأثير النتيجة الساحقة (%)', s_gap_pct: 'تأثير فرق الرانك (%، 140 = ×1.4 لكل رانك)',
  calc_legend: 'الأساسي × تأثير النتيجة × فرق الرانك', reset_all_sr: 'ترجيع كل اللاعبين لنقاط البداية',
  reset_all_sr_q: 'ترجيع كل اللاعبين المقبولين إلى {n} نقطة؟ الفوز والخسارة وسجل المباريات يبقى. استخدمه لما تبدأ موسم جديد.',
  reset_all_done: 'تم ترجيع {n} لاعب',
  theme_dark: 'الوضع الداكن', theme_light: 'الوضع الفاتح',
  dc_connect_title: 'ربط بوت الديسكورد', bot_token: 'توكن البوت', members_intent: 'صلاحية Server Members',
  dc_connect: 'ربط', dc_reconnect: 'حفظ وإعادة الربط', dc_disconnect: 'فصل', dc_token_saved: 'محفوظ — الصق توكن جديد إذا تبي تغيره',
  dc_token_env: 'توكن البوت مكتوب في ملف .env (DISCORD_TOKEN). احذفه من هناك إذا تبي تتحكم فيه من هنا.',
  dc_disconnect_q: 'حذف التوكن المحفوظ وإطفاء البوت؟', dc_connecting: 'جاري الربط بالديسكورد…', dc_connected: 'البوت شغال باسم {tag}',
  dc_step1: 'افتح <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">Discord Developer Portal</a> ← <b>New Application</b> (سمّه باسم البطولة).',
  dc_step2: 'من تبويب Bot اضغط Reset Token، انسخه والصقه فوق، واضغط ربط.',
  dc_step3: 'اختياري: من تبويب Bot فعّل "Server Members Intent" وشغّله فوق — الأسماء والصور تتحدث فوراً.',
  dc_step4: 'أضف البوت لسيرفرك:',
  dc_step5: 'في الديسكورد فعّل Developer Mode (User Settings ← Advanced)، كليك يمين على السيرفر والرومات ← Copy ID، والصقها تحت (روم التسجيل، روم المراجعة، روم النتائج، رتبة اللاعب).',
  dc_step6: 'اضغط "نشر لوحة التسجيل". اللاعب يضغط REGISTER في الديسكورد، يجيك قبول / رفض في روم المراجعة، واللي تقبله ينضاف للموقع تلقائياً.',
  e_invalid_bot_token: 'هذا ما يشبه توكن البوت — انسخه مرة ثانية من Developer Portal', e_token_in_env: 'التوكن مكتوب في .env — غيّره من هناك',
  dc_logs: 'رومات اللوق', dc_logs_sub: 'كل شي يصير في الموقع ينرسل للديسكورد',
  create_log_channels: 'إنشاء / فحص الرومات', s_log_enabled: 'إرسال سجل النشاط للديسكورد', s_log_category_id: 'آيدي الكاتيقوري لرومات اللوق',
  dc_log_pending: 'تنشأ تلقائياً لما يشتغل البوت',
  dc_logs_help: 'البوت ينشئ روم لكل نوع داخل هذي الكاتيقوري (التسجيلات، اللاعبين، المباريات، البطولات، الإعدادات، المشرفين، النظام) ويرسل فيها كل عملية. يحتاج صلاحية "Manage Channels" — أعد إضافته بزر الدعوة فوق أو أعط رتبته هذي الصلاحية. لو انحذف روم، البوت ينشئه من جديد.',
  logs_ready: 'رومات اللوق جاهزة ({n} جديدة)', e_category_not_found: 'البوت ما يشوف هذي الكاتيقوري — تأكد من الآيدي وإن البوت داخل نفس السيرفر',
  e_missing_manage_channels: 'البوت يحتاج صلاحية "Manage Channels" على الكاتيقوري',
  s_log_lang: 'لغة اللوق',
  demo_data: 'البيانات التجريبية', demo_count: '{p} لاعب · {t} بطولة',
  demo_data_help: 'يحذف بس اللاعبين والتسجيلات والبطولات التجريبية اللي ينشئها "npm run seed". اللاعبين الحقيقيين من الديسكورد وكل شي سويته أنت يبقى. وتنحفظ نسخة احتياطية من قاعدة البيانات قبلها (مجلد data).',
  demo_remove: 'حذف البيانات التجريبية', demo_remove_q: 'حذف كل اللاعبين والبطولات التجريبية؟ اللاعبين الحقيقيين يبقون وتنحفظ نسخة احتياطية قبلها.',
  demo_removed: 'انحذف {p} لاعب تجريبي و {t} بطولة تجريبية',
};

const dict = { en, ar };
const KEY = 'rein.lang';

let stored = '';
try {
  stored = localStorage.getItem(KEY) || '';
} catch {
  stored = '';
}
let lang = dict[stored] ? stored : 'en';

/** Visitors keep their own choice; otherwise the site's default language applies. */
export function initLang(fallback) {
  if (!dict[stored]) lang = dict[fallback] ? fallback : 'en';
  applyLang();
  return lang;
}

export const getLang = () => lang;

export function setLang(next) {
  lang = dict[next] ? next : 'en';
  stored = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // storage unavailable — the choice lasts for this page only
  }
  applyLang();
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

// Texts changed by the admins (Admin → Site content). { en: {key: text}, ar: {key: text} }
let overrides = { en: {}, ar: {} };
/*
 * Admin-edited texts may be shown as markup in a few places, so only harmless formatting survives:
 * <b> <i> <strong> <em> <br> and plain https links. Everything else is turned into visible text.
 */
const SAFE_TAG = /^<(\/?)(b|i|strong|em|br)\s*\/?>$|^<a href="https:\/\/[^"<>\s]+"( target="_blank")?( rel="noopener")?>$|^<\/a>$/i;
const cleanText = (str) => String(str ?? '').replace(/<[^>]*>?/g, (tag) => (SAFE_TAG.test(tag) ? tag : tag.replace(/</g, '&lt;').replace(/>/g, '&gt;')));
export function setOverrides(o) {
  const clean = (src) => Object.fromEntries(Object.entries(src ?? {}).map(([k, v]) => [k, cleanText(v)]));
  overrides = { en: clean(o?.en), ar: clean(o?.ar) };
}
export const allKeys = () => Object.keys(en);
export const baseText = (l, key) => dict[l]?.[key] ?? en[key] ?? '';

export function t(key, vars) {
  let s = overrides[lang]?.[key] ?? dict[lang][key] ?? overrides.en?.[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Translate an API error code. */
export const te = (code) => (dict[lang][`e_${code}`] ?? en[`e_${code}`] ?? dict[lang][code] ?? en[code] ?? t('error_generic'));
