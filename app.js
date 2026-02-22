(function () {
    'use strict';

    const API = 'https://nandu90.app.n8n.cloud/webhook/Resume-Screener';
    const KEY = 'recruitai_history';
    const CIRC = 2 * Math.PI * 52; // gauge circumference
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    let files = { jd: null, res: null }, draftType = '';

    /* ── Tabs ── */
    $$('.tab').forEach(t => t.addEventListener('click', () => {
        $$('.tab').forEach(b => b.classList.remove('active'));
        $$('.view').forEach(v => v.classList.remove('active'));
        t.classList.add('active');
        $(`#view-${t.dataset.tab}`).classList.add('active');
        if (t.dataset.tab === 'history') renderHist();
    }));

    /* ── File Upload Zones ── */
    function initZone(zId, fId, phId, okId, nId, xId, key) {
        const zone = $(zId), input = $(fId), ph = $(phId), ok = $(okId), name = $(nId), x = $(xId);

        zone.addEventListener('click', e => { if (!e.target.closest('.x')) input.click(); });
        input.addEventListener('change', () => input.files[0] && pick(input.files[0]));
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault(); zone.classList.remove('dragover');
            const f = e.dataTransfer.files[0];
            if (f?.type === 'application/pdf') pick(f);
        });
        x.addEventListener('click', e => { e.stopPropagation(); clear(); });

        function pick(file) {
            files[key] = file;
            zone.classList.add('done');
            ph.hidden = true; ok.hidden = false;
            name.textContent = file.name.length > 22 ? file.name.slice(0, 18) + '…' + file.name.slice(-4) : file.name;
            syncSubmit();
        }
        function clear() {
            files[key] = null;
            zone.classList.remove('done');
            ph.hidden = false; ok.hidden = true;
            input.value = '';
            syncSubmit();
        }
    }

    function syncSubmit() { $('#submit').disabled = !(files.jd && files.res); }

    /* ── n8n Response Extractor ── */
    function dig(obj) {
        if (!obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj)) {
            for (const item of obj) { const r = dig(item); if (r) return r; }
            return null;
        }
        const keys = ['Candidate Name', 'candidate_name', 'Score', 'overall_score', 'Recommended Action', 'recommendation'];
        if (keys.filter(k => obj[k] !== undefined).length >= 2) return obj;
        for (const k of Object.keys(obj)) { const r = dig(obj[k]); if (r) return r; }
        return null;
    }

    /* ── History (localStorage) ── */
    function getHistory() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch { return []; }
    }
    function saveHistory(list) { localStorage.setItem(KEY, JSON.stringify(list)); updateBadge(); }
    function addHistory(entry) { const l = getHistory(); l.unshift(entry); saveHistory(l); }
    function updateBadge() { $('#hist-count').textContent = getHistory().length; }

    function timeAgo(ts) {
        const mins = Math.floor((Date.now() - ts) / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        return hrs < 24 ? hrs + 'h ago' : Math.floor(hrs / 24) + 'd ago';
    }

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function getRecClass(rec) {
        if (/SCHEDULE|INTERVIEW/i.test(rec)) return 'schedule';
        if (/TALENT|POOL/i.test(rec)) return 'talent';
        if (/REJECT/i.test(rec)) return 'reject';
        return '';
    }

    function renderHist() {
        const list = getHistory(), empty = $('#hist-empty'), box = $('#hist-list');
        box.innerHTML = '';
        if (!list.length) { empty.hidden = false; return; }
        empty.hidden = true;

        const frag = document.createDocumentFragment();
        list.forEach((e, i) => {
            const sc = e.score > 70 ? 'hi' : e.score >= 50 ? 'mid' : 'lo';
            const el = document.createElement('div');
            el.className = 'h-item';
            el.style.animationDelay = i * 50 + 'ms';
            el.innerHTML = `<div class="h-row"><div class="h-score ${sc}">${e.score}</div><div class="h-info"><div class="h-name">${esc(e.name)}</div><div class="h-meta"><span>${esc(e.email)}</span><span class="tag ${getRecClass(e.rec)}">${esc(e.rec)}</span></div></div><div class="h-right"><div class="h-time">${timeAgo(e.ts)}</div><svg class="h-chev" width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="6,9 12,15 18,9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div></div><div class="h-summary"><div class="h-sum-lbl">Summary</div><p>${esc(e.sum || '—')}</p></div>`;
            el.querySelector('.h-row').addEventListener('click', () => el.classList.toggle('open'));
            frag.appendChild(el);
        });
        box.appendChild(frag);
    }

    /* ── Form Submit ── */
    $('#form').addEventListener('submit', async e => {
        e.preventDefault();
        if (!files.jd || !files.res) return;

        const txt = $('#s-txt'), ld = $('#s-load'), btn = $('#submit');
        txt.hidden = true; ld.hidden = false; btn.disabled = true;
        $('#results').hidden = true; $('#err').hidden = true; $('#draft').hidden = true;

        const fd = new FormData();
        fd.append('Upload_JD', files.jd, files.jd.name);
        fd.append('Upload_Resume', files.res, files.res.name);

        try {
            const r = await fetch(API, { method: 'POST', body: fd });
            if (!r.ok) throw new Error('Error ' + r.status);
            const raw = await r.text();
            let data;
            try { data = JSON.parse(raw); } catch { data = { Summary: raw }; }
            const c = dig(data);
            if (!c) throw new Error('Could not parse results');
            render(c);
        } catch (err) {
            $('#err-msg').textContent = err.message;
            $('#err').hidden = false;
        } finally {
            txt.hidden = false; ld.hidden = true; syncSubmit();
        }
    });

    /* ── Render Results ── */
    function render(c) {
        const name = c['Candidate Name'] || c.candidate_name || '—';
        const email = c['Candidate Email'] || c.candidate_email || '—';
        const score = parseInt(c.Score || c.overall_score || 0, 10);
        const rec = c['Recommended Action'] || c.recommendation || '—';
        const sum = c.Summary || c.summary || '—';

        $('#v-name').textContent = name;
        $('#v-email').textContent = email;
        $('#v-sum').textContent = sum;

        // Gauge animation
        const color = score > 70 ? '#34D399' : score >= 50 ? '#FBBF24' : '#F87171';
        const fill = $('#g-fill');
        fill.style.stroke = color;
        requestAnimationFrame(() => fill.style.strokeDashoffset = CIRC - (score / 100) * CIRC);

        const numEl = $('#g-num');
        numEl.style.color = color;
        let cur = 0;
        const step = Math.max(score / 35, 1);
        const iv = setInterval(() => {
            cur = Math.min(cur + step, score);
            numEl.textContent = Math.round(cur);
            if (cur >= score) clearInterval(iv);
        }, 25);

        // Recommendation tag
        const tag = $('#v-rec');
        tag.textContent = rec;
        tag.className = 'tag ' + getRecClass(rec);

        // Action bar
        const bar = $('#act'), ico = $('#act-ico'), msg = $('#act-msg');
        const rc = getRecClass(rec);
        if (rc) {
            bar.hidden = false;
            const labels = { schedule: ['📅', 'interview notification'], talent: ['📋', 'talent pool notification'], reject: ['✉️', 'rejection email'] };
            const [icon, label] = labels[rc] || ['📧', 'email'];
            ico.textContent = icon;
            msg.innerHTML = `<strong>Email draft ready.</strong> Review the ${label} below.`;
        } else {
            bar.hidden = true;
        }

        $('#results').hidden = false;
        addHistory({ name, email, score, rec, sum, ts: Date.now() });

        // Show draft if applicable
        if (rc) showDraft(rc, name, email, sum);
        else $('#draft').hidden = true;
    }

    /* ── Email Templates ── */
    const TEMPLATES = {
        reject: {
            title: '✉️ Rejection Email',
            hint: 'Review the rejection email and send. n8n will deliver it via Gmail.',
            subj: 'Update on Your Application',
            btn: '📤 Send Rejection Email',
            label: 'Rejection email',
            body: n => `Dear ${n},\n\nThank you for taking the time to apply and for your interest in this position.\n\nAfter careful review of your application, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely align with the requirements of this role.\n\nPlease know this does not reflect on your abilities, and we encourage you to apply for future openings that match your skill set.\n\nWe wish you all the best in your career.\n\nWarm regards,\nThe Hiring Team`
        },
        talent: {
            title: '📋 Talent Pool Email',
            hint: "Let the candidate know they've been added to the talent pool. n8n will deliver it via Gmail.",
            subj: "You've Been Added to Our Talent Pool!",
            btn: '📤 Send Talent Pool Email',
            label: 'Talent pool notification',
            body: (n, s) => `Dear ${n},\n\nThank you for applying. After reviewing your profile, we were impressed by your background and qualifications.\n\nWhile we have decided to move forward with another candidate for this specific role, we would love to keep you in mind for future opportunities. Your profile has been added to our talent pool.\n\nHere is a summary of our assessment:\n\n${s}\n\nWe encourage you to keep an eye on our careers page and apply for roles that align with your expertise. We believe your skills would be a great fit for upcoming positions.\n\nThank you for your interest, and we look forward to staying in touch.\n\nBest regards,\nThe Hiring Team`
        },
        interview: {
            title: '📅 Interview Confirmation Email',
            hint: 'Notify the candidate that their interview has been scheduled. n8n will deliver it via Gmail.',
            subj: 'Interview Scheduled — Next Steps',
            btn: '📤 Send Interview Confirmation',
            label: 'Interview confirmation',
            body: n => `Dear ${n},\n\nGreat news! After reviewing your application, we are pleased to inform you that you have been shortlisted for an interview.\n\nYour interview has been scheduled and you will receive a separate calendar invite shortly with the date, time, and meeting details.\n\nIn the meantime, please feel free to reach out if you have any questions or need to reschedule.\n\nWe look forward to speaking with you!\n\nBest regards,\nThe Hiring Team`
        }
    };

    function showDraft(type, name, email, sum) {
        draftType = type;
        const tmpl = TEMPLATES[type];
        $('#draft').className = 'card draft draft-' + type;
        $('#draft-to').value = email;
        $('#draft-title').textContent = tmpl.title;
        $('#draft-hint').textContent = tmpl.hint;
        $('#draft-subj').value = tmpl.subj;
        $('#send-txt').textContent = tmpl.btn;
        $('#draft-body').value = tmpl.body(name, sum);
        $('#draft').hidden = false;
        $('#draft-sent').hidden = true;
        $('#btn-send-draft').disabled = false;
        $('#btn-send-draft').hidden = false;
        $('#send-txt').hidden = false;
        $('#send-load').hidden = true;
        $('.draft-form').hidden = false;
        $('#draft-hint').hidden = false;
    }

    /* ── Send Email ── */
    const ACTION_MAP = { reject: 'send_rejection', talent: 'send_talent_pool', interview: 'send_interview' };

    $('#btn-send-draft').addEventListener('click', async () => {
        const to = $('#draft-to').value, subj = $('#draft-subj').value, body = $('#draft-body').value;
        if (!to || !body) return;

        $('#send-txt').hidden = true; $('#send-load').hidden = false; $('#btn-send-draft').disabled = true;

        try {
            const r = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: ACTION_MAP[draftType] || 'send_email', type: draftType, to, subject: subj, message: body, candidateEmail: to })
            });
            if (!r.ok) throw new Error('Failed to send');

            const lbl = TEMPLATES[draftType]?.label || 'Email';
            $('#draft-sent').hidden = false;
            $('#btn-send-draft').hidden = true;
            $('.draft-form').hidden = true;
            $('#draft-hint').hidden = true;
            $('#draft-sent-msg').textContent = lbl + ' sent successfully via n8n → Gmail';
            $('#act-msg').innerHTML = `<strong>${lbl} sent.</strong> Delivered to <strong>${to}</strong> via Gmail.`;

            setTimeout(() => {
                const d = $('#draft');
                d.style.opacity = '0'; d.style.transform = 'translateY(-10px)';
                setTimeout(() => { d.hidden = true; d.style.opacity = ''; d.style.transform = ''; }, 400);
            }, 2500);
        } catch (err) {
            alert('Failed to send email: ' + err.message);
            $('#btn-send-draft').disabled = false;
        } finally {
            $('#send-txt').hidden = false; $('#send-load').hidden = true;
        }
    });

    /* ── Discard & Reset ── */
    $('#btn-discard').addEventListener('click', () => { $('#draft').hidden = true; });

    function reset() {
        $('#results').hidden = true; $('#err').hidden = true; $('#draft').hidden = true;
        const f = $('#g-fill');
        f.style.strokeDashoffset = CIRC; f.style.stroke = '';
        $('#g-num').textContent = '0'; $('#g-num').style.color = '';
        $('#act').hidden = true;
        $('#btn-send-draft').hidden = false; $('#draft-sent').hidden = true;
        $('.draft-form').hidden = false; $('#draft-hint').hidden = false;
        files = { jd: null, res: null }; draftType = '';
        ['jd', 'res'].forEach(k => {
            $(`#f-${k}`).value = '';
            $(`#z-${k}`).classList.remove('done');
            $(`#ph-${k}`).hidden = false;
            $(`#ok-${k}`).hidden = true;
        });
        syncSubmit();
    }

    $('#btn-new').addEventListener('click', reset);
    $('#btn-retry').addEventListener('click', reset);
    $('#btn-clear').addEventListener('click', () => {
        if (confirm('Clear all candidate history?')) {
            localStorage.removeItem(KEY); updateBadge(); renderHist();
        }
    });

    /* ── Connection Check ── */
    async function checkConn() {
        const dot = $('#dot'), lbl = $('#conn-lbl');
        dot.className = 'dot checking'; lbl.textContent = 'Checking n8n…';
        try {
            await fetch(API, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
            dot.className = 'dot online'; lbl.textContent = 'n8n Connected';
        } catch {
            dot.className = 'dot offline'; lbl.textContent = 'n8n Disconnected';
        }
    }

    /* ── Init ── */
    initZone('#z-jd', '#f-jd', '#ph-jd', '#ok-jd', '#n-jd', '#x-jd', 'jd');
    initZone('#z-res', '#f-res', '#ph-res', '#ok-res', '#n-res', '#x-res', 'res');
    updateBadge();
    checkConn();
    setInterval(checkConn, 30000);
})();
