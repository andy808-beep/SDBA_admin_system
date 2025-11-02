// totals.js
// Compute estimated totals using ONLY values from window.__CONFIG
//
// QA ACCEPTANCE CHECKS:
// - Rendering: all sections appear/hide per config; re-init doesn't duplicate DOM
// - Totals: changing package/qty/slots updates immediately
// - Submit: idempotency returns same registration_id; receipt persisted
// - Redirects: legacy URLs land on register.html?e=<ref>

import { collectStateFromForm } from './ui_bindings.js';

function assertConfig() {
	const cfg = window.__CONFIG || null;
	if (!cfg || typeof cfg !== 'object') throw new Error('Configuration not loaded');
	return cfg;
}

function money(n) {
	if (!isFinite(n)) return '0';
	return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'HKD', currencyDisplay: 'code', minimumFractionDigits: 0 }).format(n).replace('HKD', 'HK$');
}

function findByCode(list, keys, code) {
	if (!Array.isArray(list) || !code) return null;
	for (const item of list) {
		for (const k of keys) {
			if (item[k] && String(item[k]) === String(code)) return item;
		}
	}
	return null;
}

function getPracticeRules(cfg) {
	// tolerant: try multiple paths
	return (
		cfg.practice_rules ||
		(cfg.practice && cfg.practice.rules) ||
		cfg.limits?.practice_rules ||
		{ base_fee: 0, per_hour: 0 }
	);
}

function getTimeslotByCode(cfg, slotCode) {
	return findByCode(cfg.timeslots || [], ['slot_code', 'code', 'id'], slotCode);
}

export function recomputeTotals() {
	const cfg = assertConfig();
	const state = collectStateFromForm();

	let total = 0;

	// Packages: from teams → package_id
	if (Array.isArray(state.teams)) {
		for (const t of state.teams) {
			const pkg = findByCode(cfg.packages, ['package_code', 'code', 'id'], t.package_id || t.package_code);
			if (pkg && typeof pkg.listed_unit_price === 'number') total += pkg.listed_unit_price;
		}
	}

	// Race-day items: qty * price
	if (Array.isArray(state.race_day)) {
		for (const rd of state.race_day) {
			const item = findByCode(cfg.race_day_items, ['item_code', 'code', 'id'], rd.item_code);
			const qty = Number(rd.qty || 0);
			if (item && typeof item.listed_unit_price === 'number' && qty > 0) total += item.listed_unit_price * qty;
		}
	}

	// Practice
	const rules = getPracticeRules(cfg);
	let practiceUsed = false;
	if (Array.isArray(state.practice)) {
		for (const pr of state.practice) {
			// Per-hour charge via slot
			if (pr.slot_code) {
				const slot = getTimeslotByCode(cfg, pr.slot_code);
				const hours = Number(pr.duration_hours || slot?.duration_hours || 0);
				if (hours > 0 && typeof rules.per_hour === 'number') {
					total += rules.per_hour * hours;
					practiceUsed = true;
				}
			}
			// Item charges (qty * price)
			if (pr.item_code) {
				const item = findByCode(cfg.practice, ['item_code', 'code', 'id'], pr.item_code);
				const qty = Number(pr.qty || 0);
				if (item && typeof item.listed_unit_price === 'number' && qty > 0) {
					total += item.listed_unit_price * qty;
					practiceUsed = true;
				}
			}
		}
	}
	if (practiceUsed && typeof rules.base_fee === 'number') total += rules.base_fee;

	return total;
}

export function bindTotals() {
	const container = document.getElementById('formContainer') || document.body;
	const update = () => {
		try {
			const total = recomputeTotals();
			const mount = document.getElementById('estimatedTotal');
			if (mount) mount.textContent = money(total);
		} catch (e) {
			// keep tolerant; log for debugging
			console.debug('bindTotals:update failed', e);
		}
	};
	container.addEventListener('input', update, { passive: true });
	container.addEventListener('change', update, { passive: true });
	// initial compute
	queueMicrotask(update);
}

export default bindTotals;


