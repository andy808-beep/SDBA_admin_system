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
import { RateLimiter } from './rate-limiter.js';
import { logError, logWarning, addBreadcrumb } from './error-handler.js';
import Logger from './logger.js';
import { fetchWithErrorHandling } from './api-client.js';

const EDGE_URL = `${window.ENV?.SUPABASE_URL || ''}/functions/v1/submit_registration`;

/**
 * Rate limiting configuration
 * Adjust these values to control form submission rate limits
 */
const RATE_LIMIT_CONFIG = {
  maxRequests: 3,
  windowMs: 60000, // 1 minute
  storage: 'localStorage' // 'localStorage' (shared across tabs) or 'memory' (per-tab only)
};

// Create global rate limiter instance
const rateLimiter = new RateLimiter(RATE_LIMIT_CONFIG);

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
	const result = await fetchWithErrorHandling(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
		context: 'form_submission',
		timeout: 60000 // 60 seconds for form submission
	});
	
	if (result.ok) {
		return { ok: true, status: result.status, data: result.data };
	} else {
		// Return error in consistent format
		return {
			ok: false,
			status: result.status || 0,
			data: {
				error_code: result.errorType,
				error_message: result.userMessage || result.error
			}
		};
	}
}

function mapError(code) {
	const labels = (window.__CONFIG && window.__CONFIG.labels) || {};
	const fromConfig = labels?.error_codes?.[code];
	if (fromConfig) return fromConfig;
	
	// Use i18n error code mapping if available
	if (window.i18n && window.errorCodeMap) {
		const translationKey = window.errorCodeMap[code];
		if (translationKey) {
			return window.i18n.t(translationKey);
		}
	}
	
	// Fallback messages (in case i18n not loaded)
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
	if (span) {
		// Use textContent for XSS safety
		span.textContent = message || 'Error';
	}
	if (box) box.style.display = 'block';
	Logger.warn('submit error', { message, details });
}

/**
 * Format milliseconds into human-readable time string
 * 
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string (e.g., "45 seconds", "1 minute")
 */
function formatTimeRemaining(ms) {
	const seconds = Math.ceil(ms / 1000);
	
	// Use i18n if available
	const t = (key, params) => window.i18n ? window.i18n.t(key, params) : null;
	
	if (seconds < 60) {
		const secondLabel = t(seconds !== 1 ? 'seconds' : 'second');
		if (secondLabel) {
			return `${seconds} ${secondLabel}`;
		}
		return `${seconds} second${seconds !== 1 ? 's' : ''}`;
	}
	
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	
	if (remainingSeconds === 0) {
		const minuteLabel = t(minutes !== 1 ? 'minutes' : 'minute');
		if (minuteLabel) {
			return `${minutes} ${minuteLabel}`;
		}
		return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
	}
	
	const minuteLabel = t(minutes !== 1 ? 'minutes' : 'minute');
	const secondLabel = t(remainingSeconds !== 1 ? 'seconds' : 'second');
	if (minuteLabel && secondLabel) {
		return `${minutes} ${minuteLabel} ${remainingSeconds} ${secondLabel}`;
	}
	return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
}

/**
 * Update submit button state based on rate limit status
 * Shows countdown timer and disables button when rate limited
 */
function updateSubmitButtonState() {
	const btn = document.getElementById('submitBtn');
	if (!btn) return;
	
	// Clear any existing interval
	if (window.__rateLimitUpdateInterval) {
		clearInterval(window.__rateLimitUpdateInterval);
		window.__rateLimitUpdateInterval = null;
	}
	
	const canSubmit = rateLimiter.canMakeRequest();
	const timeUntilReset = rateLimiter.getTimeUntilReset();
	const remaining = rateLimiter.getRemainingRequests();
	
	if (canSubmit) {
		// Button is enabled
		btn.disabled = false;
		btn.dataset.rateLimited = '0';
		
		// Restore original button text if it was changed
		const originalText = btn.dataset.originalText;
		if (originalText) {
			btn.textContent = originalText;
			delete btn.dataset.originalText;
		}
	} else {
		// Button is rate limited
		btn.disabled = true;
		btn.dataset.rateLimited = '1';
		
		// Store original text if not already stored
		if (!btn.dataset.originalText) {
			btn.dataset.originalText = btn.textContent;
		}
		
		// Update button text with countdown
		const updateCountdown = () => {
			const timeLeft = rateLimiter.getTimeUntilReset();
			if (timeLeft > 0) {
				const timeStr = formatTimeRemaining(timeLeft);
				const currentRemaining = rateLimiter.getRemainingRequests();
				btn.textContent = `Please wait ${timeStr} (${RATE_LIMIT_CONFIG.maxRequests - currentRemaining} of ${RATE_LIMIT_CONFIG.maxRequests} submissions used)`;
			} else {
				// Time expired, re-enable button
				updateSubmitButtonState();
			}
		};
		
		updateCountdown();
		
		// Update countdown every second
		window.__rateLimitUpdateInterval = setInterval(updateCountdown, 1000);
	}
}

/**
 * Start monitoring rate limit status and update button accordingly
 * This ensures the button state stays in sync across tabs
 */
function startRateLimitMonitoring() {
	// Update immediately
	updateSubmitButtonState();
	
	// Update every second to keep countdown accurate
	if (!window.__rateLimitMonitorInterval) {
		window.__rateLimitMonitorInterval = setInterval(() => {
			updateSubmitButtonState();
		}, 1000);
	}
	
	// Listen for storage events (for cross-tab synchronization)
	if (RATE_LIMIT_CONFIG.storage === 'localStorage') {
		window.addEventListener('storage', (e) => {
			if (e.key === rateLimiter.storageKey) {
				updateSubmitButtonState();
			}
		});
	}
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
	
	// Add breadcrumb for button click
	addBreadcrumb('Submit button clicked', 'user', 'info', {
		action: 'form_submit_click',
		eventRef: getEventShortRef()
	});
	
	// Check rate limit before proceeding
	if (!rateLimiter.canMakeRequest()) {
		const timeUntilReset = rateLimiter.getTimeUntilReset();
		const timeStr = formatTimeRemaining(timeUntilReset);
		const remaining = rateLimiter.getRemainingRequests();
		const message = window.i18n 
			? window.i18n.t('pleaseWaitBeforeSubmitting', { max: RATE_LIMIT_CONFIG.maxRequests, time: timeStr })
			: `Please wait before submitting again. You can submit ${RATE_LIMIT_CONFIG.maxRequests} times per minute. Please wait ${timeStr}.`;
		
		// Log rate limit hit
		addBreadcrumb('Rate limit exceeded', 'user', 'warning', {
			timeUntilReset,
			remaining
		});
		
		showError(message, { rateLimited: true, timeUntilReset });
		updateSubmitButtonState();
		return;
	}
	
	btn.dataset.busy = '1';
	btn.disabled = true;
	hideError();

	try {
		// Record the request attempt
		rateLimiter.recordRequest();
		
		// Update button state to reflect new rate limit status
		updateSubmitButtonState();
		
		const payload = makePayload();
		
		// Add breadcrumb with form state (without sensitive data)
		addBreadcrumb('Form submission started', 'user', 'info', {
			eventRef: payload.event_short_ref,
			teamCount: payload.teams?.length || 0,
			hasPractice: !!payload.practice,
			raceDayItems: payload.race_day?.length || 0
		});
		
		const { ok, status, data } = await postJSON(EDGE_URL, payload);
		if (ok) {
			const { registration_id, team_codes, email } = data || {};
			const receipt = saveReceipt({ registration_id, team_codes, email });
			
			// Log successful submission
			addBreadcrumb('Form submission successful', 'user', 'info', {
				registration_id,
				team_codes_count: team_codes?.length || 0
			});
			
			showConfirmation(receipt);
		} else {
			const code = data?.error_code || (status === 429 ? 'E.RATE_LIMIT' : 'E.UNKNOWN');
			const errorMessage = data?.error_message || mapError(code);
			
			// Log submission error
			logError(new Error(`Form submission failed: ${errorMessage}`), {
				action: 'form_submission_failed',
				errorCode: code,
				status,
				eventRef: payload.event_short_ref,
				teamCount: payload.teams?.length || 0
			}, 'error', ['form_submission', 'api_error']);
			
			addBreadcrumb('Form submission failed', 'user', 'error', {
				errorCode: code,
				status,
				message: errorMessage
			});
			
			// Show user-friendly error message
			showError(errorMessage, { code, status, payload });
			btn.dataset.busy = '0';
			// Don't re-enable if rate limited - let updateSubmitButtonState handle it
			if (rateLimiter.canMakeRequest()) {
				btn.disabled = false;
			} else {
				updateSubmitButtonState();
			}
		}
	} catch (err) {
		// Log network/other errors
		logError(err, {
			action: 'form_submission_exception',
			eventRef: getEventShortRef(),
			url: EDGE_URL
		}, 'error', ['network_error', 'form_submission']);
		
		addBreadcrumb('Form submission exception', 'user', 'error', {
			error: err.message,
			type: err.name
		});
		
		showError(window.i18n ? window.i18n.t('networkError') : 'Network error. Please try again.', { err });
		btn.dataset.busy = '0';
		// Don't re-enable if rate limited - let updateSubmitButtonState handle it
		if (rateLimiter.canMakeRequest()) {
			btn.disabled = false;
		} else {
			updateSubmitButtonState();
		}
	}
}

export function bindSubmit() {
	const btn = document.getElementById('submitBtn');
	if (!btn) return;
	if (!EDGE_URL) {
		const error = new Error('EDGE_URL missing (check env.js)');
		logWarning(error, { action: 'submit_binding', missing: 'EDGE_URL' });
		Logger.warn('submit.js: EDGE_URL missing (check env.js)');
	}
	if (!btn.dataset.bound) {
		btn.addEventListener('click', handleSubmitClick);
		btn.dataset.bound = '1';
		
		// Add breadcrumb for submit button binding
		addBreadcrumb('Submit button bound', 'ui', 'info', {
			action: 'submit_button_initialized'
		});
		
		// Start rate limit monitoring
		startRateLimitMonitoring();
	}
}

// Export shared utilities for TN wizard
export { EDGE_URL, getClientTxId, getEventShortRef, postJSON, saveReceipt, showConfirmation, mapError };

// Export rate limiter for external access (useful for testing or debugging)
export { rateLimiter, RATE_LIMIT_CONFIG };

export default bindSubmit;


