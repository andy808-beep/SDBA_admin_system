import { test, expect } from '@playwright/test';

test('TN Step 4 practice booking end-to-end', async ({ page }) => {
  await page.goto('http://localhost:3000/register.html?e=tn');

  // Wait for page to load and debug functions to be available
  await page.waitForFunction(() => !!(window as any).__DBG_TN?.previewStep4);
  
  // Jump to step 4 via debug function
  await page.evaluate(() => (window as any).__DBG_TN.previewStep4());

  // Wait for calendar to be rendered
  await page.waitForSelector('#calendarContainer input[type="checkbox"]');

  // Select two dates and set duration/helper for each
  await page.click('input[data-date="2025-01-15"]');
  await page.selectOption('[data-date="2025-01-15"] .duration', '2');
  await page.selectOption('[data-date="2025-01-15"] .helpers', 'ST');

  await page.click('input[data-date="2025-01-17"]');
  await page.selectOption('[data-date="2025-01-17"] .duration', '1');
  await page.selectOption('[data-date="2025-01-17"] .helpers', 'S');

  // Assert store contains array rows with correct shape
  const rowsT1 = await page.evaluate(() => {
    // Use debug function if available, otherwise fallback to sessionStorage
    return (window as any).__DBG_TN?.readTeamRows?.('t1')
      || JSON.parse(sessionStorage.getItem('tn_practice_team_t1') || '[]');
  });
  
  expect(Array.isArray(rowsT1)).toBeTruthy();
  expect(rowsT1).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ pref_date: '2025-01-15', duration_hours: 2, helper: 'ST' }),
      expect.objectContaining({ pref_date: '2025-01-17', duration_hours: 1, helper: 'S' }),
    ])
  );

  // Switch to Team 2
  await page.selectOption('#teamSelect', '1'); // Team 2 = index 1
  await page.waitForSelector('#copyFromTeam1Btn');
  await page.click('#copyFromTeam1Btn');

  // Verify Team 2 reflects copied dates
  const rowsT2 = await page.evaluate(() => {
    return (window as any).__DBG_TN?.readTeamRows?.('t2')
      || JSON.parse(sessionStorage.getItem('tn_practice_team_t2') || '[]');
  });
  expect(rowsT2.length).toBeGreaterThanOrEqual(2);
  expect(rowsT2).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ pref_date: '2025-01-15', duration_hours: 2, helper: 'ST' }),
      expect.objectContaining({ pref_date: '2025-01-17', duration_hours: 1, helper: 'S' }),
    ])
  );

  // Set slot rankings (adjust selectors to match actual DOM)
  await page.selectOption('#slotPref2h_1', 'SUN2_1100_1300');
  await page.selectOption('#slotPref2h_2', 'SUN2_1515_1715');
  await page.selectOption('#slotPref2h_3', 'SAT2_1000_1200');

  // Verify slot rankings are persisted
  const ranksT2 = await page.evaluate(() => {
    return (window as any).__DBG_TN?.readTeamRanks?.('t2')
      || JSON.parse(sessionStorage.getItem('tn_slot_ranks_t2') || '[]');
  });
  expect(ranksT2.length).toBeGreaterThanOrEqual(3);
  expect(ranksT2).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ rank: 1, slot_code: 'SUN2_1100_1300' }),
      expect.objectContaining({ rank: 2, slot_code: 'SUN2_1515_1715' }),
      expect.objectContaining({ rank: 3, slot_code: 'SAT2_1000_1200' }),
    ])
  );

  // Validate payload shape built in page context
  const payload = await page.evaluate(async () => {
    // Access the makePayload function from the page context
    const makePayload = (window as any).makePayload;
    if (makePayload) {
      return await makePayload();
    }
    return null;
  });
  
  expect(payload).toBeTruthy();
  expect(payload.practice).toBeTruthy();
  expect(payload.practice.teams).toBeTruthy();
  expect(Array.isArray(payload.practice.teams)).toBeTruthy();
  
  // Verify Team 2 has the expected data structure
  const team2 = payload.practice.teams.find(t => t.team_key === 't2');
  expect(team2).toBeTruthy();
  expect(team2.dates).toBeTruthy();
  expect(team2.slot_ranks).toBeTruthy();
  expect(Array.isArray(team2.dates)).toBeTruthy();
  expect(Array.isArray(team2.slot_ranks)).toBeTruthy();
  expect(team2.dates.length).toBeGreaterThanOrEqual(2);
  expect(team2.slot_ranks.length).toBeGreaterThanOrEqual(3);

  // Verify date structure
  expect(team2.dates).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ 
        pref_date: '2025-01-15', 
        duration_hours: 2, 
        helper: 'ST' 
      }),
      expect.objectContaining({ 
        pref_date: '2025-01-17', 
        duration_hours: 1, 
        helper: 'S' 
      }),
    ])
  );

  // Verify slot ranks structure
  expect(team2.slot_ranks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ rank: 1, slot_code: 'SUN2_1100_1300' }),
      expect.objectContaining({ rank: 2, slot_code: 'SUN2_1515_1715' }),
      expect.objectContaining({ rank: 3, slot_code: 'SAT2_1000_1200' }),
    ])
  );
});
