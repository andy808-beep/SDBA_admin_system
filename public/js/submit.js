// submit.js
// Dynamic submit flow for the universal form (no hardcoded field IDs)
//
// QA ACCEPTANCE CHECKS:
// - Rendering: all sections appear/hide per config; re-init doesn't duplicate DOM
// - Totals: changing package/qty/slots updates immediately
// - Submit: idempotency returns same registration_id; receipt persisted
// - Redirects: legacy URLs land on register.html?e=<ref>

import { collectStateFromForm } from './ui_bindings.js';
import { readTeamRows, readTeamRanks } from './tn_practice_store.js';

const EDGE_URL = `${window.ENV?.SUPABASE_URL || ''}/functions/v1/submit_registration`;

function getEventShortRef() {
	const cfg = window.__CONFIG || {};
	return cfg?.event?.event_short_ref || cfg?.event?.short_ref || '';
}

function getClientTxId() {
	const key = 'raceApp:client_tx_id';
	let id = localStorage.getItem(key);
	if (!id) {
		id = (self.crypto?.randomUUID && self.crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2);
		localStorage.setItem(key, id);
	}
	return id;
}

function readHoneypot() {
	const hp = document.getElementById('website_hp');
	return hp ? (hp.value || '') : '';
}

function buildTNTeamsFromUI() {
	// Build teams array from TN wizard UI
	const teams = [];
	const teamCount = parseInt(sessionStorage.getItem('tn_team_count'), 10) || 0;
	
	for (let i = 1; i <= teamCount; i++) {
		const teamName = sessionStorage.getItem(`tn_team_name_${i}`);
		const teamCategory = sessionStorage.getItem(`tn_team_category_${i}`);
		const teamOption = sessionStorage.getItem(`tn_team_option_${i}`);
		
		if (teamName) {
			teams.push({
				key: `t${i}`,
				name: teamName,
				category: teamCategory,
				option: teamOption,
				index: i - 1
			});
		}
	}
	
	return teams;
}

function makePayload() {
	const base = collectStateFromForm();
	const payload = {
		client_tx_id: getClientTxId(),
		event_short_ref: base.event_short_ref || getEventShortRef(),
		contact: base.contact || {},
		teams: base.teams || [],
		race_day: base.race_day || [],
		packages: base.packages || [],
		hp: readHoneypot()
	};
	
	if (window.__PRACTICE_ENABLED) {
		const teams = (base.teams || []).map((t,i) => ({ key: t.key || `t${i+1}`, name: t.name, index: i }));
		payload.practice = {
			teams: teams.map(t => ({
				team_key: t.key,
				dates: (readTeamRows(t.key)||[]).map(r => ({
					pref_date: r.pref_date,
					duration_hours: Number(r.duration_hours||1),
					helper: r.helper || 'NONE'
				})),
				slot_ranks: (readTeamRanks?.(t.key)||[]).map(x => ({ rank: Number(x.rank), slot_code: x.slot_code }))
			}))
		};
	} else {
		// For WU/SC events, send no practice data
		payload.practice = [];
	}
	
	return payload;
}

async function postJSON(url, body) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	return { ok: res.ok, status: res.status, data };
}

function mapError(code) {
	const labels = (window.__CONFIG && window.__CONFIG.labels) || {};
	const fromConfig = labels?.error_codes?.[code];
	if (fromConfig) return fromConfig;
	const FALLBACK = {
		'E.EVENT_DISABLED': 'This event is currently not accepting registrations.',
		'E.DIVISION_INACTIVE': 'That division is not open.',
		'E.PACKAGE_INACTIVE': 'Selected package is unavailable.',
		'E.QTY_LIMIT': 'Quantity exceeds the allowed limit.',
		'E.PRACTICE_WINDOW': 'Selected practice date is outside the allowed window.',
		'E.SLOT_INVALID': 'Selected practice time slot is invalid.',
		'E.DUPLICATE': 'A submission with the same details already exists.',
		'E.HONEYPOT': 'Submission blocked. Please try again.',
		'E.RATE_LIMIT': 'Too many attempts. Please wait a minute and try again.',
		'E.BAD_PAYLOAD': 'Your submission looks incomplete. Please review and resubmit.',
		'E.UNKNOWN': 'Something went wrong. Please try again.'
	};
	return FALLBACK[code] || FALLBACK['E.UNKNOWN'];
}

function showError(message, details) {
	const box = document.getElementById('errorBox');
	const span = document.getElementById('errorMessage');
	if (span) span.textContent = message || 'Error';
	if (box) box.style.display = 'block';
	console.warn('submit error', { message, details });
}

function hideError() {
	const box = document.getElementById('errorBox');
	if (box) box.style.display = 'none';
}

function saveReceipt({ registration_id, team_codes, email }) {
	const receipt = {
		registration_id,
		team_codes,
		event_short_ref: getEventShortRef(),
		email: email || '',
		ts: Date.now(),
		version: 1
	};
	try {
		localStorage.setItem(`raceApp:receipt:${registration_id}`, JSON.stringify(receipt));
		localStorage.setItem('raceApp:last_receipt', JSON.stringify(receipt));
	} catch {}
	return receipt;
}

function showConfirmation({ registration_id, team_codes }) {
	const box = document.getElementById('confirmationBox');
	if (!box) return;
	const idEl = document.getElementById('registrationId');
	const codesEl = document.getElementById('teamCodes');
	if (idEl) idEl.textContent = registration_id || '';
	if (codesEl) codesEl.textContent = Array.isArray(team_codes) ? team_codes.join(', ') : '';
	box.style.display = 'block';

    const labels = (window.__CONFIG && window.__CONFIG.labels) || {};
    const idLabel = labels.registration_id_label || '—';
    const codesLabel = labels.team_codes_label || '—';
    const title = labels.confirmation_title || '';
    const copyText = labels.copy_button || '—';
    const shareText = labels.share_button || '—';
    const msg = `${title || 'Registration'} ${registration_id}\n${codesLabel}: ${(team_codes || []).join(', ')}`;
    const copyBtn = document.getElementById('copyBtn');
    const shareBtn = document.getElementById('shareBtn');
    if (copyBtn) copyBtn.textContent = copyText;
    if (shareBtn) shareBtn.textContent = shareText;
	if (copyBtn && !copyBtn.dataset.bound) {
		copyBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(msg); } catch {} });
		copyBtn.dataset.bound = '1';
	}
	if (shareBtn && !shareBtn.dataset.bound) {
		shareBtn.addEventListener('click', async () => {
			if (navigator.share) {
				try { await navigator.share({ title: 'Registration Confirmation', text: msg }); } catch {}
			} else {
				try { await navigator.clipboard.writeText(msg); } catch {}
			}
		});
		shareBtn.dataset.bound = '1';
	}
}

async function handleSubmitClick(e) {
	const btn = e.currentTarget;
	if (btn.dataset.busy === '1') return;
	btn.dataset.busy = '1';
	btn.disabled = true;
	hideError();

	try {
		const payload = makePayload();
		const { ok, status, data } = await postJSON(EDGE_URL, payload);
		if (ok) {
			const { registration_id, team_codes, email } = data || {};
			const receipt = saveReceipt({ registration_id, team_codes, email });
			showConfirmation(receipt);
		} else {
			const code = data?.error_code || (status === 429 ? 'E.RATE_LIMIT' : 'E.UNKNOWN');
			showError(mapError(code), { code, status, payload });
			btn.dataset.busy = '0';
			btn.disabled = false;
		}
	} catch (err) {
		showError('Network error. Please try again.', { err });
		btn.dataset.busy = '0';
		btn.disabled = false;
	}
}

export function bindSubmit() {
	const btn = document.getElementById('submitBtn');
	if (!btn) return;
	if (!EDGE_URL) console.warn('submit.js: EDGE_URL missing (check env.js)');
	if (!btn.dataset.bound) {
		btn.addEventListener('click', handleSubmitClick);
		btn.dataset.bound = '1';
	}
}

export default bindSubmit;


