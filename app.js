(function () {
    'use strict';
    const API = 'https://nandu90.app.n8n.cloud/webhook/Resume-Screener';
    const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
    const KEY = 'recruitai_history';
    let files = { jd: null, res: null }, draftType = '';

    // Tabs
    $$('.tab').forEach(t => { t.onclick = () => { $$('.tab').forEach(b => b.classList.remove('active')); $$('.view').forEach(v => v.classList.remove('active')); t.classList.add('active'); $('#view-' + t.dataset.tab).classList.add('active'); if (t.dataset.tab === 'history') renderHist(); } });

    // Upload zones
    function zone(z, f, ph, ok, n, x, k) {
        const Z = $(z), F = $(f), P = $(ph), O = $(ok), N = $(n), X = $(x);
        Z.onclick = e => { if (!e.target.closest('.x')) F.click() };
        F.onchange = () => F.files[0] && pick(F.files[0]);
        Z.ondragover = e => { e.preventDefault(); Z.classList.add('dragover') };
        Z.ondragleave = () => Z.classList.remove('dragover');
        Z.ondrop = e => { e.preventDefault(); Z.classList.remove('dragover'); const d = e.dataTransfer.files[0]; d?.type === 'application/pdf' && pick(d) };
        X.onclick = e => { e.stopPropagation(); clr() };
        function pick(file) { files[k] = file; Z.classList.add('done'); P.hidden = true; O.hidden = false; N.textContent = file.name.length > 22 ? file.name.slice(0, 18) + '…' + file.name.slice(-4) : file.name; sync() }
        function clr() { files[k] = null; Z.classList.remove('done'); P.hidden = false; O.hidden = true; F.value = ''; sync() }
    }
    function sync() { $('#submit').disabled = !(files.jd && files.res) }

    // n8n response extractor
    function dig(o) {
        if (!o || typeof o !== 'object') return null;
        if (Array.isArray(o)) { for (const i of o) { const r = dig(i); if (r) return r } return null }
        const ks = ['Candidate Name', 'candidate_name', 'Score', 'overall_score', 'Recommended Action', 'recommendation'];
        let h = 0; for (const k of ks) if (o[k] !== undefined) h++;
        if (h >= 2) return o;
        for (const k of Object.keys(o)) { const r = dig(o[k]); if (r) return r }
        return null;
    }

    // History
    function getH() { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
    function saveH(l) { localStorage.setItem(KEY, JSON.stringify(l)); updC() }
    function addH(e) { const l = getH(); l.unshift(e); saveH(l) }
    function updC() { $('#hist-count').textContent = getH().length }
    function ago(ts) { const d = Date.now() - ts, m = Math.floor(d / 60000); if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago' }
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML }
    function renderHist() {
        const list = getH(), empty = $('#hist-empty'), box = $('#hist-list');
        box.innerHTML = '';
        if (!list.length) { empty.hidden = false; return }
        empty.hidden = true;
        list.forEach((e, i) => {
            const sc = e.score > 70 ? 'hi' : e.score >= 50 ? 'mid' : 'lo';
            let tc = ''; if (/SCHEDULE|INTERVIEW/i.test(e.rec)) tc = 'schedule'; else if (/TALENT|POOL/i.test(e.rec)) tc = 'talent'; else if (/REJECT/i.test(e.rec)) tc = 'reject';
            const el = document.createElement('div'); el.className = 'h-item'; el.style.animationDelay = i * 50 + 'ms';
            el.innerHTML = `<div class="h-row"><div class="h-score ${sc}">${e.score}</div><div class="h-info"><div class="h-name">${esc(e.name)}</div><div class="h-meta"><span>${esc(e.email)}</span><span class="tag ${tc}">${esc(e.rec)}</span></div></div><div class="h-right"><div class="h-time">${ago(e.ts)}</div><svg class="h-chev" width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="6,9 12,15 18,9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div></div><div class="h-summary"><div class="h-sum-lbl">Summary</div><p>${esc(e.sum || '—')}</p></div>`;
            el.querySelector('.h-row').onclick = () => el.classList.toggle('open');
            box.appendChild(el);
        });
    }

    // Submit
    $('#form').onsubmit = async e => {
        e.preventDefault(); if (!files.jd || !files.res) return;
        const txt = $('#s-txt'), ld = $('#s-load'), btn = $('#submit');
        txt.hidden = true; ld.hidden = false; btn.disabled = true;
        $('#results').hidden = true; $('#err').hidden = true; $('#draft').hidden = true;
        const fd = new FormData(); fd.append('Upload_JD', files.jd, files.jd.name); fd.append('Upload_Resume', files.res, files.res.name);
        try {
            const r = await fetch(API, { method: 'POST', body: fd });
            if (!r.ok) throw new Error('Error ' + r.status);
            const raw = await r.text(); let data; try { data = JSON.parse(raw) } catch { data = { Summary: raw } }
            const c = dig(data); if (!c) throw new Error('Could not parse results');
            render(c);
        } catch (e) { $('#err-msg').textContent = e.message; $('#err').hidden = false }
        finally { txt.hidden = false; ld.hidden = true; sync() }
    };

    // Render
    function render(c) {
        const name = c['Candidate Name'] || c.candidate_name || '—', email = c['Candidate Email'] || c.candidate_email || '—',
            score = parseInt(c.Score || c.overall_score || 0, 10), rec = c['Recommended Action'] || c.recommendation || '—', sum = c.Summary || c.summary || '—';
        $('#v-name').textContent = name; $('#v-email').textContent = email; $('#v-sum').textContent = sum;
        const C = 2 * Math.PI * 52, color = score > 70 ? '#34D399' : score >= 50 ? '#FBBF24' : '#F87171';
        const fl = $('#g-fill'); fl.style.stroke = color; requestAnimationFrame(() => fl.style.strokeDashoffset = C - (score / 100) * C);
        const sn = $('#g-num'); sn.style.color = color; let cur = 0; const step = Math.max(score / 35, 1);
        const iv = setInterval(() => { cur = Math.min(cur + step, score); sn.textContent = Math.round(cur); if (cur >= score) clearInterval(iv) }, 25);
        const t = $('#v-rec'); t.textContent = rec; t.className = 'tag';
        if (/SCHEDULE|INTERVIEW/i.test(rec)) t.classList.add('schedule'); else if (/TALENT|POOL/i.test(rec)) t.classList.add('talent'); else if (/REJECT/i.test(rec)) t.classList.add('reject');
        const bar = $('#act'), ico = $('#act-ico'), msg = $('#act-msg'); bar.hidden = false;
        if (/SCHEDULE|INTERVIEW/i.test(rec)) { ico.textContent = '📅'; msg.innerHTML = `<strong>Email draft ready.</strong> Review the interview notification below.` }
        else if (/TALENT|POOL/i.test(rec)) { ico.textContent = '📋'; msg.innerHTML = `<strong>Email draft ready.</strong> Review the talent pool notification below.` }
        else if (/REJECT/i.test(rec)) { ico.textContent = '✉️'; msg.innerHTML = `<strong>Email draft ready.</strong> Review the rejection email below.` }
        else bar.hidden = true;
        $('#results').hidden = false; addH({ name, email, score, rec, sum, ts: Date.now() });
        if (/SCHEDULE|INTERVIEW/i.test(rec)) showDraft('interview', name, email, sum);
        else if (/TALENT|POOL/i.test(rec)) showDraft('talent', name, email, sum);
        else if (/REJECT/i.test(rec)) showDraft('reject', name, email, sum);
        else $('#draft').hidden = true;
    }

    // Email draft templates
    const TEMPLATES = {
        reject: {
            ico: '✉️', title: '✉️ Rejection Email', hint: 'Review the rejection email and send. n8n will deliver it via Gmail.', subj: 'Update on Your Application', btn: '📤 Send Rejection Email', label: 'Rejection email',
            body: (n) => `Dear ${n},\n\nThank you for taking the time to apply and for your interest in this position.\n\nAfter careful review of your application, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely align with the requirements of this role.\n\nPlease know this does not reflect on your abilities, and we encourage you to apply for future openings that match your skill set.\n\nWe wish you all the best in your career.\n\nWarm regards,\nThe Hiring Team`
        },
        talent: {
            ico: '📋', title: '📋 Talent Pool Email', hint: 'Let the candidate know they\'ve been added to the talent pool. n8n will deliver it via Gmail.', subj: 'You\'ve Been Added to Our Talent Pool!', btn: '📤 Send Talent Pool Email', label: 'Talent pool notification',
            body: (n, s) => `Dear ${n},\n\nThank you for applying. After reviewing your profile, we were impressed by your background and qualifications.\n\nWhile we have decided to move forward with another candidate for this specific role, we would love to keep you in mind for future opportunities. Your profile has been added to our talent pool.\n\nHere is a summary of our assessment:\n\n${s}\n\nWe encourage you to keep an eye on our careers page and apply for roles that align with your expertise. We believe your skills would be a great fit for upcoming positions.\n\nThank you for your interest, and we look forward to staying in touch.\n\nBest regards,\nThe Hiring Team`
        },
        interview: {
            ico: '📅', title: '📅 Interview Confirmation Email', hint: 'Notify the candidate that their interview has been scheduled. n8n will deliver it via Gmail.', subj: 'Interview Scheduled — Next Steps', btn: '📤 Send Interview Confirmation', label: 'Interview confirmation',
            body: (n) => `Dear ${n},\n\nGreat news! After reviewing your application, we are pleased to inform you that you have been shortlisted for an interview.\n\nYour interview has been scheduled and you will receive a separate calendar invite shortly with the date, time, and meeting details.\n\nIn the meantime, please feel free to reach out if you have any questions or need to reschedule.\n\nWe look forward to speaking with you!\n\nBest regards,\nThe Hiring Team`
        }
    };

    function showDraft(type, name, email, sum) {
        draftType = type;
        const tmpl = TEMPLATES[type], d = $('#draft');
        d.className = 'card draft draft-' + type;
        $('#draft-to').value = email; $('#draft-title').textContent = tmpl.title;
        $('#draft-hint').textContent = tmpl.hint; $('#draft-subj').value = tmpl.subj;
        $('#send-txt').textContent = tmpl.btn; $('#draft-body').value = tmpl.body(name, sum);
        d.hidden = false; $('#draft-sent').hidden = true;
        $('#btn-send-draft').disabled = false; $('#btn-send-draft').hidden = false;
        $('#send-txt').hidden = false; $('#send-load').hidden = true;
        $('.draft-form').hidden = false; $('#draft-hint').hidden = false;
    }

    // Send email
    const ACTION_MAP = { reject: 'send_rejection', talent: 'send_talent_pool', interview: 'send_interview' };
    $('#btn-send-draft').onclick = async () => {
        const to = $('#draft-to').value, subj = $('#draft-subj').value, body = $('#draft-body').value;
        if (!to || !body) return;
        $('#send-txt').hidden = true; $('#send-load').hidden = false; $('#btn-send-draft').disabled = true;
        try {
            const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: ACTION_MAP[draftType] || 'send_email', type: draftType, to, subject: subj, message: body, candidateEmail: to }) });
            if (!r.ok) throw new Error('Failed to send');
            const lbl = TEMPLATES[draftType]?.label || 'Email';
            $('#draft-sent').hidden = false; $('#btn-send-draft').hidden = true; $('.draft-form').hidden = true; $('#draft-hint').hidden = true;
            $('#draft-sent-msg').textContent = lbl + ' sent successfully via n8n → Gmail';
            $('#act-msg').innerHTML = `<strong>${lbl} sent.</strong> Delivered to <strong>${to}</strong> via Gmail.`;
            setTimeout(() => { $('#draft').style.opacity = '0'; $('#draft').style.transform = 'translateY(-10px)'; setTimeout(() => { $('#draft').hidden = true; $('#draft').style.opacity = ''; $('#draft').style.transform = ''; }, 400); }, 2500);
        } catch (e) { alert('Failed to send email: ' + e.message); $('#btn-send-draft').disabled = false; }
        finally { $('#send-txt').hidden = false; $('#send-load').hidden = true; }
    };

    // Discard & Reset
    $('#btn-discard').onclick = () => { $('#draft').hidden = true; };
    function reset() {
        $('#results').hidden = true; $('#err').hidden = true; $('#draft').hidden = true;
        const f = $('#g-fill'); f.style.strokeDashoffset = 326.73; f.style.stroke = ''; $('#g-num').textContent = '0'; $('#g-num').style.color = ''; $('#act').hidden = true;
        $('#btn-send-draft').hidden = false; $('#draft-sent').hidden = true; $('.draft-form').hidden = false; $('#draft-hint').hidden = false;
        files.jd = null; files.res = null; draftType = '';
        ['jd', 'res'].forEach(k => { $('#f-' + k).value = ''; $('#z-' + k).classList.remove('done'); $('#ph-' + k).hidden = false; $('#ok-' + k).hidden = true; });
        sync();
    }
    $('#btn-new').onclick = reset; $('#btn-retry').onclick = reset;
    $('#btn-clear').onclick = () => { if (confirm('Clear all candidate history?')) { localStorage.removeItem(KEY); updC(); renderHist() } };

    // Connection check
    async function checkConn() { const d = $('#dot'), l = $('#conn-lbl'); d.className = 'dot checking'; l.textContent = 'Checking n8n…'; try { await fetch(API, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }); d.className = 'dot online'; l.textContent = 'n8n Connected' } catch { d.className = 'dot offline'; l.textContent = 'n8n Disconnected' } }

    // Init
    zone('#z-jd', '#f-jd', '#ph-jd', '#ok-jd', '#n-jd', '#x-jd', 'jd');
    zone('#z-res', '#f-res', '#ph-res', '#ok-res', '#n-res', '#x-res', 'res');
    updC(); checkConn(); setInterval(checkConn, 30000);
})();
