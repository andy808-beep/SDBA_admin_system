// ui_bindings.js
// Dynamic UI bindings for the universal form
//
// QA ACCEPTANCE CHECKS:
// - Rendering: all sections appear/hide per config; re-init doesn't duplicate DOM
// - Totals: changing package/qty/slots updates immediately
// - Submit: idempotency returns same registration_id; receipt persisted
// - Redirects: legacy URLs land on register.html?e=<ref>

// Public API:
// - initFormForEvent(eventShortRef)
// - collectStateFromForm()

// Utilities
const isTNMode = () => {
	const cfg = window.__CONFIG;
	return cfg?.event?.event_short_ref === 'tn';
};

const dom = (() => {
	const cache = new Map();
	const q = (sel) => {
		if (cache.has(sel)) {
			const el = cache.get(sel);
			if (el && document.contains(el)) return el;
		}
		const found = document.querySelector(sel);
		if (found) cache.set(sel, found);
		return found;
	};
	const qa = (sel) => Array.from(document.querySelectorAll(sel));
	const setRequired = (el, on) => {
		if (!el) return;
		if (on) el.setAttribute('required', '');
		else el.removeAttribute('required');
	};
	const setHidden = (elOrSel, hidden) => {
		const el = typeof elOrSel === 'string' ? q(elOrSel) : elOrSel;
		if (!el) return;
		el.classList.toggle('hidden', !!hidden);
	};
	const fillSelect = (selectEl, options, { valueKey = 'id', labelKey = 'label' } = {}) => {
		if (!selectEl) return;
		// Build normalized new list
		const normalized = (options || []).map((o) => (
			typeof o === 'string' ? { value: String(o), label: String(o) } : { value: o[valueKey], label: (o[labelKey] ?? o[valueKey]) }
		));
		// If current options already match, skip updates
		const current = Array.from(selectEl.children)
			.filter((c) => c.tagName === 'OPTION')
			.map((c) => ({ value: c.getAttribute('value') ?? '', label: c.textContent ?? '' }));
		const same = current.length === normalized.length && current.every((co, i) => co.value === String(normalized[i].value ?? '') && co.label === String(normalized[i].label ?? ''));
		if (same) return;
		// Only remove existing OPTION children
		Array.from(selectEl.children).forEach((child) => { if (child.tagName === 'OPTION') child.remove(); });
		const add = (value, label) => {
			const opt = document.createElement('option');
			opt.value = value != null ? String(value) : '';
			opt.textContent = label != null ? String(label) : '';
			selectEl.appendChild(opt);
		};
		for (const o of options || []) {
			if (typeof o === 'string') add(o, o);
			else add(o[valueKey], o[labelKey] ?? o[valueKey]);
		}
	};
	const setText = (el, text) => { if (el) el.textContent = text ?? ''; };
	return { q, qa, setRequired, setHidden, fillSelect, setText };
})();

// Copy bindings: map DOM selectors to config paths (dot notation)
const copyBindings = {
	'#formTitle': 'labels.form_title',
	'#formSubtitle': 'labels.form_subtitle',
	'#teamsHint': 'labels.teams_hint',
	'#formHeader': 'labels.form_title',
	'#confirmationTitle': 'labels.confirmation_title',
	'#registrationIdLabel': 'labels.registration_id_label',
	'#teamCodesLabel': 'labels.team_codes_label',
	'#copyBtn': 'labels.copy_button',
	'#shareBtn': 'labels.share_button',
	'#prevBtn': 'labels.prev_button',
	'#nextBtn': 'labels.next_button',
	'#submitBtn': 'labels.submit_button'
};

function getByPath(obj, path) {
	if (!obj || !path) return undefined;
	return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function applyCopyBindings(cfg) {
	Object.entries(copyBindings).forEach(([sel, path]) => {
		const val = getByPath(cfg, path);
		if (val == null || val === '') return;
		const node = dom.q(sel);
		if (!node) {
			console.debug('applyCopyBindings: node not found', sel);
			return;
		}
		if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
			node.setAttribute('placeholder', String(val || '—'));
		} else if (node.tagName === 'BUTTON') {
			dom.setText(node, String(val || '—'));
		} else {
			dom.setText(node, String(val || ''));
		}
	});
}

// Visibility/required parity with precedence:
// profile overrides section flags; section flags override per-input flags
function applyVisibilityAndRequired(cfg) {
	const fields = cfg.fields || {};
	const profile = (cfg.profiles && cfg.profiles.form_profile) || (cfg.event && cfg.event.form_profile) || '';

	// Section-level visibility
	let hideTeams = !!(fields.teams && fields.teams.hidden);
	let hidePractice = !!(fields.practice && fields.practice.hidden);
	let hideRaceDay = !!(fields.race_day && fields.race_day.hidden);

	// Profile overrides
	if (String(profile).toLowerCase() === 'practice_only') {
		hideRaceDay = true;
	}

	// Apply to sections
	dom.setHidden('#teamsSection', hideTeams);
	dom.setHidden('#practiceSection', hidePractice);
	dom.setHidden('#raceDaySection', hideRaceDay);

	// Per-input flags (applied after section hides; no-op if node missing)
	const contactCfg = fields.contact || {};
	const contactNameEl = dom.q('#contact_name');
	if (contactNameEl) dom.setRequired(contactNameEl, !!contactCfg.required_name);

	const phoneWrap = dom.q('#phoneWrap');
	if (phoneWrap) dom.setHidden(phoneWrap, !!contactCfg.hide_phone);
}

function assertConfig() {
	const cfg = window.__CONFIG || null;
	if (!cfg || typeof cfg !== 'object') {
		throw new Error('Configuration not loaded');
	}
	return cfg;
}

function getLabel(labels, key, fallback = '') {
	if (!labels) return fallback;
	return labels[key] ?? fallback;
}

function createEl(tag, attrs = {}, children = []) {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (k === 'class') el.className = v;
		else if (k === 'text') el.textContent = v;
		else if (v !== undefined && v !== null) el.setAttribute(k, String(v));
	}
	for (const child of children) {
		if (child == null) continue;
		el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
	}
	return el;
}

function renderField(key, meta = {}, labels = {}) {
	// meta: { type, required, visible, options, placeholder }
	if (meta.visible === false) return null;
	const labelText = meta.label ?? getLabel(labels, key, key);
	const wrapper = createEl('div', { class: 'form-group' });
	const label = createEl('label', { for: key, text: labelText + (meta.required ? ' *' : '') });
	let control;
	const type = meta.type || 'text';
	if (type === 'textarea') {
		control = createEl('textarea', { id: key, name: key, rows: meta.rows || 3, 'data-name': key });
	} else if (type === 'select') {
		control = createEl('select', { id: key, name: key, 'data-name': key });
		const opts = Array.isArray(meta.options) ? meta.options : [];
		for (const o of opts) {
			// option can be { value, label } or string
			const value = typeof o === 'string' ? o : (o.value ?? '');
			const text = typeof o === 'string' ? o : (o.label ?? value);
			control.appendChild(createEl('option', { value }, [text]));
		}
	} else {
		// default input
		control = createEl('input', { id: key, name: key, type, 'data-name': key });
	}
	if (meta.placeholder) control.setAttribute('placeholder', meta.placeholder);
	if (meta.required) control.required = true;
	wrapper.appendChild(label);
	wrapper.appendChild(control);
	return wrapper;
}

function renderContactSection(cfg) {
	// Skip rendering for TN mode - TN uses legacy templates
	if (isTNMode()) return;
	
	const mount = dom.q('#contactSection');
	if (!mount) return;
	
	// Clear existing form groups
	dom.qa('#contactSection .form-group').forEach(n => n.remove());
	
	// Create basic contact fields since config.fields.contact doesn't exist
	const labels = cfg.labels || {};
	const fragment = document.createDocumentFragment();
	
	// Name field
	const nameField = renderField('contact_name', { 
		type: 'text', 
		required: true, 
		label: getLabel(labels, 'contact_name', 'Name'),
		placeholder: getLabel(labels, 'contact_name_placeholder', 'Enter your name')
	}, labels);
	if (nameField) fragment.appendChild(nameField);
	
	// Email field
	const emailField = renderField('contact_email', { 
		type: 'email', 
		required: true, 
		label: getLabel(labels, 'contact_email', 'Email'),
		placeholder: getLabel(labels, 'contact_email_placeholder', 'Enter your email')
	}, labels);
	if (emailField) fragment.appendChild(emailField);
	
	// Phone field
	const phoneField = renderField('contact_phone', { 
		type: 'tel', 
		required: false, 
		label: getLabel(labels, 'contact_phone', 'Phone'),
		placeholder: getLabel(labels, 'contact_phone_placeholder', 'Enter your phone number')
	}, labels);
	if (phoneField) fragment.appendChild(phoneField);
	
	mount.appendChild(fragment);
}

function renderTeamSection(cfg) {
	// Skip rendering for TN mode - TN uses legacy templates
	if (isTNMode()) return;
	
	const mount = dom.q('#teamsSection');
	if (!mount) return;

	// Clear existing content
	mount.innerHTML = '';
	
	// Create teams list container
	const list = createEl('div', { id: 'teamsList', class: 'teams-list' });
	mount.appendChild(list);
	
	// Create add button
	const addBtn = createEl('button', { 
		id: 'addTeamBtn', 
		type: 'button', 
		class: 'btn-secondary',
		text: getLabel(cfg.labels || {}, 'add_team', 'Add Team')
	});
	mount.appendChild(addBtn);

	// Attach handler once
	if (addBtn && addBtn.dataset.bound !== '1') {
		addBtn.addEventListener('click', () => addTeamRow(cfg));
		addBtn.dataset.bound = '1';
	}

	// Add at least one team row
	if (list && list.dataset.initialized !== '1') {
		addTeamRow(cfg);
		list.dataset.initialized = '1';
	}
}

function buildTeamRows(cfg) {
	const teamDetails = dom.q('#teamsMount');
	if (!teamDetails) return;
	teamDetails.innerHTML = '';
	const num = Number(dom.q('#numTeams')?.value || 1);
	const labels = cfg.labels || {};
	for (let i = 1; i <= Math.max(1, num); i++) {
		const row = createEl('div', { class: 'form-row' });
		// Team name
		row.appendChild(renderField(`team_${i}_name`, { type: 'text', required: true, label: getLabel(labels, 'team_name', 'Team Name') }, labels));
		// Division select
		const divisionSelect = createEl('select', { id: `team_${i}_division`, name: `team_${i}_division`, 'data-name': `team_${i}_division` });
		dom.fillSelect(divisionSelect, (cfg.divisions || []).map(d => ({ id: d.division_code ?? d.code ?? d.id ?? '', label: d.name_en ?? d.title_en ?? (d.division_code ?? '') })));
		row.appendChild(wrapLabeled(`team_${i}_division_label`, getLabel(labels, 'division', 'Division'), divisionSelect));
		// Package select
		const pkgSelect = createEl('select', { id: `team_${i}_package`, name: `team_${i}_package`, 'data-name': `team_${i}_package` });
		dom.fillSelect(pkgSelect, (cfg.packages || []).map(p => ({ id: p.package_code ?? p.code ?? p.id ?? '', label: p.title_en ?? p.name_en ?? (p.package_code ?? '') })));
		row.appendChild(wrapLabeled(`team_${i}_package_label`, getLabel(labels, 'package', 'Package'), pkgSelect));
		teamDetails.appendChild(row);
	}
}

function nextTeamIndex() {
	const list = dom.q('#teamsList') || dom.q('#teamsMount');
	if (!list) return 1;
	const rows = list.querySelectorAll('[data-row="team"]');
	return rows.length + 1;
}

function addTeamRow(cfg) {
	// Skip rendering for TN mode - TN uses legacy templates
	if (isTNMode()) return;
	
	const list = dom.q('#teamsList') || dom.q('#teamsMount');
	if (!list) return;
	const tpl = document.getElementById('teamRowTpl');
	let row;
	if (tpl && tpl.content) {
		row = tpl.content.firstElementChild.cloneNode(true);
	} else {
		const i = nextTeamIndex();
		row = createEl('div', { class: 'team-row', 'data-row': 'team' });
		const name = createEl('input', { type: 'text', id: `team_${i}_name`, name: `team_${i}_name`, 'data-name': `team_${i}_name` });
		const divSel = createEl('select', { id: `team_${i}_division`, name: `team_${i}_division`, 'data-name': `team_${i}_division` });
		const pkgSel = createEl('select', { id: `team_${i}_package`, name: `team_${i}_package`, 'data-name': `team_${i}_package` });
		dom.fillSelect(divSel, (cfg.divisions || []).map(d => ({ id: d.division_code ?? d.code ?? d.id ?? '', label: d.name_en ?? d.title_en ?? (d.division_code ?? '') })));
		dom.fillSelect(pkgSel, (cfg.packages || []).map(p => ({ id: p.package_code ?? p.code ?? p.id ?? '', label: p.title_en ?? p.name_en ?? (p.package_code ?? '') })));
		const rowInner = createEl('div', { class: 'form-row' });
		rowInner.appendChild(wrapLabeled(`team_${i}_name_label`, '', name));
		rowInner.appendChild(wrapLabeled(`team_${i}_division_label`, '', divSel));
		rowInner.appendChild(wrapLabeled(`team_${i}_package_label`, '', pkgSel));
		row.appendChild(rowInner);
	}
	row.setAttribute('data-row', 'team');
	list.appendChild(row);
}

function wrapLabeled(id, labelText, controlEl) {
	const wrap = createEl('div', { class: 'form-group' });
	wrap.appendChild(createEl('label', { for: id, text: labelText }));
	controlEl.id = id.replace('_label', '');
	wrap.appendChild(controlEl);
	return wrap;
}

function renderRaceDaySection(cfg) {
	// Skip rendering for TN mode - TN uses legacy templates
	if (isTNMode()) return;
	
	const mount = dom.q('#raceDaySection');
	if (!mount) return;
	
	// Clear existing content
	mount.innerHTML = '';
	
	// Create race day items container
	const itemsContainer = createEl('div', { id: 'raceDayMount', class: 'race-day-items' });
	mount.appendChild(itemsContainer);
	
	// Render race day items from config
	for (const item of cfg.race_day_items || []) {
		const valueKey = item.item_code ?? item.code ?? item.id ?? '';
		const row = createEl('div', { class: 'form-row' });
		const qtyInput = createEl('input', { 
			type: 'number', 
			min: String(item.min_qty ?? 0), 
			max: String(item.max_qty ?? 99), 
			value: '0', 
			'data-group': 'race_day', 
			'data-code': valueKey 
		});
		row.appendChild(wrapLabeled(`rd_${valueKey}`, item.title_en ?? valueKey, qtyInput));
		itemsContainer.appendChild(row);
	}
}

function renderPracticeSection(cfg) {
	// Skip rendering for TN mode - TN uses legacy templates
	if (isTNMode()) return;
	
	const mount = dom.q('#practiceSection');
	if (!mount) return;

	// Clear existing content
	mount.innerHTML = '';
	
	// Create practice list container
	const list = createEl('div', { id: 'practiceList', class: 'practice-list' });
	mount.appendChild(list);
	
	// Create add button
	const addBtn = createEl('button', { 
		id: 'addPracticeBtn', 
		type: 'button', 
		class: 'btn-secondary',
		text: getLabel(cfg.labels || {}, 'add_practice', 'Add Practice')
	});
	mount.appendChild(addBtn);

	if (addBtn && addBtn.dataset.bound !== '1') {
		addBtn.addEventListener('click', () => addPracticeRow(cfg));
		addBtn.dataset.bound = '1';
	}

	if (list && list.dataset.initialized !== '1') {
		addPracticeRow(cfg);
		list.dataset.initialized = '1';
	}

	// Also render a slot picker if timeslots exist (outside of repeater rows)
	const slotEl = dom.q('#practice_slot') || null;
	if (!slotEl && Array.isArray(cfg.timeslots) && cfg.timeslots.length > 0) {
		const slotWrap = createEl('div', { class: 'form-group' });
		slotWrap.appendChild(createEl('label', { for: 'practice_slot', text: getLabel(cfg.labels || {}, 'practice_slot', 'Practice Slot') }));
		const sel = createEl('select', { id: 'practice_slot', name: 'practice_slot', 'data-group': 'practice_slot' });
		dom.fillSelect(sel, (cfg.timeslots || []).map(s => ({ id: s.slot_code ?? s.code ?? '', label: s.label ?? (s.slot_code ?? '') })));
		mount.appendChild(slotWrap);
		slotWrap.appendChild(sel);
	}
}

function nextPracticeIndex() {
	const list = dom.q('#practiceList') || dom.q('#practiceMount');
	if (!list) return 1;
	return list.querySelectorAll('[data-row="practice"]').length + 1;
}

function addPracticeRow(cfg) {
	// Skip rendering for TN mode - TN uses legacy templates
	if (isTNMode()) return;
	
	const list = dom.q('#practiceList') || dom.q('#practiceMount');
	if (!list) return;
	const tpl = document.getElementById('practiceRowTpl');
	let row;
	if (tpl && tpl.content) {
		row = tpl.content.firstElementChild.cloneNode(true);
	} else {
		const i = nextPracticeIndex();
		row = createEl('div', { class: 'practice-row', 'data-row': 'practice' });
		const itemSel = createEl('select', { id: `practice_item_${i}`, name: `practice_item_${i}`, 'data-name': `practice_${i}_item` });
		const qty = createEl('input', { type: 'number', min: '0', value: '0', id: `practice_qty_${i}`, name: `practice_qty_${i}`, 'data-name': `practice_${i}_qty` });
		dom.fillSelect(itemSel, (assertConfig().practice || []).map(it => ({ id: it.item_code ?? it.code ?? '', label: it.title_en ?? (it.item_code ?? '') })));
		const rowInner = createEl('div', { class: 'form-row' });
		rowInner.appendChild(wrapLabeled(`practice_item_${i}_label`, '', itemSel));
		rowInner.appendChild(wrapLabeled(`practice_qty_${i}_label`, '', qty));
		row.appendChild(rowInner);
	}
	row.setAttribute('data-row', 'practice');
	list.appendChild(row);
}

export function collectStateFromForm() {
    // Build a structured payload using current markup conventions
    const state = { contact: { name: '', email: '', phone: '' }, teams: [], race_day: [], practice: [], packages: [] };
    const cfg = assertConfig();

    // Section visibility tolerance
    const teamsHidden = dom.q('#teamsSection')?.classList.contains('hidden');
    const practiceHidden = dom.q('#practiceSection')?.classList.contains('hidden');
    const raceDayHidden = dom.q('#raceDaySection')?.classList.contains('hidden');

    // Contact: try specific IDs first, then data-name fallbacks
    const nameEl = dom.q('#contact_name') || dom.q('#contactName') || dom.q('[data-name="contact_name"]');
    const emailEl = dom.q('#contact_email') || dom.q('#contactEmail') || dom.q('[data-name="contact_email"]');
    const phoneEl = dom.q('#contact_phone') || dom.q('#contactPhone') || dom.q('[data-name="contact_phone"]');
    state.contact.name = nameEl?.value?.trim?.() ?? '';
    state.contact.email = emailEl?.value?.trim?.() ?? '';
    state.contact.phone = phoneEl?.value?.trim?.() ?? '';

    // Teams
    if (!teamsHidden) {
        const teamRows = dom.qa('#teamsList [data-row="team"], #teamsMount [data-row="team"]');
        if (teamRows.length > 0) {
            teamRows.forEach((row, idx) => {
                const name = row.querySelector('input[data-name$="_name"], input[name="team_name"], input[id^="team_"]')?.value || '';
                const division_code = row.querySelector('select[data-name$="_division"], select[name="division_code"], select[id^="team_"]')?.value || '';
                const package_id = row.querySelector('select[data-name$="_package"], select[name="package_id"], select[id^="team_"]')?.value || '';
                state.teams.push({ name, division_code, package_id });
                if (package_id) state.packages.push({ package_id, qty: 1 });
            });
        }
    }

    // Race day
    if (!raceDayHidden) {
        const rdInputs = dom.qa('[data-group="race_day"]');
        for (const el of rdInputs) {
            const item_code = el.getAttribute('data-code');
            const qty = Number(el.value || 0);
            if (item_code && qty > 0) state.race_day.push({ item_code, qty });
        }
    }

    // Practice preferences
    if (!practiceHidden) {
        const practiceRows = dom.qa('#practiceList [data-row="practice"], #practiceMount [data-row="practice"]');
        if (practiceRows.length > 0) {
            practiceRows.forEach((row) => {
                const pref_date = row.querySelector('input[name="pref_date"], input[data-name$="pref_date"]')?.value || '';
                const duration_hours = Number(row.querySelector('input[name="duration_hours"], input[data-name$="duration_hours"]')?.value || 0) || undefined;
                const slot_code = row.querySelector('select[name="slot_code"], select[data-name$="slot_code"], select#practice_slot')?.value || '';
                const need_steersman = !!row.querySelector('input[name="need_steersman"], input[data-name$="need_steersman"]')?.checked;
                const need_coach = !!row.querySelector('input[name="need_coach"], input[data-name$="need_coach"]')?.checked;
                const entry = { pref_date, duration_hours, slot_code, need_steersman, need_coach };
                // Only push if at least one field is present
                if (pref_date || slot_code || duration_hours || need_steersman || need_coach) state.practice.push(entry);
            });
        } else {
            // Fallback: single slot selector
            const slot_code = dom.q('#practice_slot')?.value || '';
            if (slot_code) state.practice.push({ pref_date: '', duration_hours: undefined, slot_code, need_steersman: false, need_coach: false });
        }
    }

    // Attach event ref if present
    if (cfg?.event?.event_short_ref) {
        state.event_short_ref = cfg.event.event_short_ref;
    }

    return state;
}

function renderSummarySection(cfg) {
	// Skip rendering for TN mode - TN uses legacy templates
	if (isTNMode()) return;
	
	const mount = dom.q('#summarySection');
	if (!mount) return;
	
	// Clear existing content
	mount.innerHTML = '';
	
	// Create summary content
	const summaryContent = createEl('div', { id: 'summaryMount', class: 'summary-content' });
	mount.appendChild(summaryContent);
	
	// Add estimated total display
	const totalEl = createEl('div', { 
		id: 'estimatedTotal', 
		class: 'estimated-total',
		text: 'Total: $0.00'
	});
	summaryContent.appendChild(totalEl);
}

export function initFormForEvent(eventShortRef) {
	const cfg = assertConfig();
	if (eventShortRef && cfg?.event?.event_short_ref && cfg.event.event_short_ref !== eventShortRef) {
		// Mismatch warning only in console
		console.warn('initFormForEvent: ref mismatch between arg and loaded config', { arg: eventShortRef, loaded: cfg.event.event_short_ref });
	}
	
	// Skip all rendering for TN mode - TN uses legacy templates and wizard
	if (isTNMode()) {
		console.log('initFormForEvent: Skipping single-page form rendering for TN mode');
		return;
	}
	
	// Apply label/help text bindings from config
	applyCopyBindings(cfg);
	// Apply visibility/required based on config + profile precedence
	applyVisibilityAndRequired(cfg);
	// Render sections
	renderContactSection(cfg);
	renderTeamSection(cfg);
	renderRaceDaySection(cfg);
	renderPracticeSection(cfg);
	renderSummarySection(cfg);
}
