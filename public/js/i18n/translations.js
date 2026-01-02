/**
 * SDBA Registration Forms - Translation Dictionary
 * 
 * This file contains all static UI text translations for the public registration forms.
 * 
 * Languages supported:
 * - en: English (default)
 * - zh: Traditional Chinese (繁體中文) for Hong Kong
 * 
 * Usage:
 * - Import this file to access the translations object
 * - Use t('keyName') function from i18n-engine.js to get translated text
 * - For dynamic values, use {paramName} syntax: t('minLength', { min: 5 })
 * 
 * @version 1.0.0
 * @date 2025-12-15
 */

const translations = {
  en: {
    // ============================================
    // NAVIGATION & BUTTONS
    // ============================================
    
    // Generic navigation
    nextButton: "Next →",
    previousButton: "← Previous",
    backButton: "← Back",
    submitButton: "Submit Application",
    cancelButton: "Cancel",
    confirmButton: "Confirm",
    editButton: "Edit",
    saveButton: "Save",
    closeButton: "Close",
    goNowButton: "Go Now",
    
    // Step-specific navigation (TN Wizard)
    nextTeamInfo: "Next: Team Information →",
    backTeamSelection: "← Back: Team Selection",
    nextRaceDay: "Next: Race Day Arrangements →",
    backTeamInfo: "← Back: Team Information",
    nextPractice: "Next: Practice Booking →",
    backRaceDay: "← Back: Race Day",
    nextSummary: "Next: Summary →",
    backPractice: "← Back: Practice",
    
    // Action buttons
    copyDetails: "Copy Details",
    copyFromTeam1: "Copy from Team 1",
    clearCacheReload: "Clear Cache & Reload",
    clickToSelect: "Click to select",
    selected: "Selected",
    copiedSuccess: "Copied!",

    // ============================================
    // STEPPER STEPS (TN Wizard - 5 steps)
    // ============================================
    
    tnStep1: "1. Teams",
    tnStep2: "2. Contacts",
    tnStep3: "3. Race Day",
    tnStep4: "4. Practice",
    tnStep5: "5. Summary",
    
    // ============================================
    // STEPPER STEPS (WU/SC Wizard - 4 steps)
    // ============================================
    
    wuScStep1: "1. Teams",
    wuScStep2: "2. Contacts",
    wuScStep3: "3. Race Day",
    wuScStep4: "4. Summary",

    // ============================================
    // PAGE TITLES & HEADINGS
    // ============================================
    
    // Main page
    stanleyDragonBoatAssociation: "Stanley Dragon Boat Association",
    raceRegistration: "Race Registration",
    selectRacePrompt: "Please select the race you would like to register for:",
    
    // Race Info page (before step 1)
    raceInfoTitle: "Race Info",
    raceInfoEvent: "Event",
    raceInfoDate: "Date",
    raceInfoTime: "Time",
    raceInfoVenue: "Venue",
    raceInfoCourse: "Race Course",
    raceInfoDeadline: "Application Deadline",
    raceInfoAppendix: "Registration Appendix",
    raceInfoClickHere: "Click Here",
    raceInfoNext: "Next",
    
    // Success page
    applicationSubmittedSuccess: "Application Submitted Successfully!",
    thankYouMessage: "Thank you for your registration. Your application has been received.",
    registrationDetails: "Registration Details",
    redirectingMessage: "Redirecting to event selection in {seconds} seconds...",
    saveRecordsMessage: "Please save your Registration ID and Team Codes for your records.",
    
    // Step headings (TN)
    selectRaceCategory: "Select Race Category",
    teamInformation: "Team Information",
    raceDayArrangement: "Race Day Arrangement",
    practiceBookingTitle: "Practice Booking ({startMonth}–{endMonth})",
    practiceBookingTitleFallback: "Practice Booking",
    applicationSummary: "Application Summary",
    
    // Step headings (WU/SC)
    selectTeamDetails: "Team Details",
    
    // Section headings
    organizationManagerInfo: "Organization & Team Manager Information",
    organizationGroupInfo: "Organization/Group Information",
    teamManager1Required: "Team Manager 1 (Required)",
    teamManager2Required: "Team Manager 2 (Required)",
    teamManager3Optional: "Team Manager 3 (Optional)",
    raceDayArrangements: "Race Day Arrangements",
    timeSlotPreferenceRanking: "Time Slot Preference Ranking",
    practiceBookingSummary: "Practice Booking Summary",
    entryOptions: "Entry Options",

    // ============================================
    // FORM LABELS
    // ============================================
    
    // Team selection
    chooseCategory: "Choose category:",
    howManyTeams: "How many teams will you register?*",
    howManyTeamsQuestion: "How many teams do you want to register?",
    oneTeam: "1 team",
    nTeams: "{count} teams",
    teamLabel: "Team {num}",
    teamNameLabel: "Team Name*",
    teamNameEnLabel: "Team Name (English)*",
    teamNameTcLabel: "Team Name (Chinese)",
    teamNameEnPlaceholder: "Please provide team name",
    teamNameTcPlaceholder: "Optional",
    raceCategoryLabel: "Race Category*",
    entryOptionLabel: "Entry Option*",
    selectTeamLabel: "Select Team:",
    nowScheduling: "Now scheduling: {teamName}",
    
    // Organization
    organizationGroupName: "Organization / Group Name*",
    organizationGroupNameShort: "Organization/Group Name*",
    mailingAddress: "Mailing Address*",
    addressLabel: "Address*",
    teamManagerContact: "Team Manager Contact",
    
    // Manager fields
    nameLabel: "Name*",
    nameLabelOptional: "Name",
    phoneLabel: "Phone*",
    phoneLabelOptional: "Phone",
    emailLabel: "Email*",
    emailLabelOptional: "Email",
    
    // Race day items
    raceDayItems: "Race Day Items",
    athleteMarquee: "Athlete Marquee",
    officialSteersman: "Official Steersman",
    junkRegistration: "Junk Registration",
    speedBoatRegistration: "Speed Boat Registration",
    pleasureBoatNo: "Pleasure Boat No.:",
    speedBoatNo: "Speed Boat No.:",
    unitPrice: "Unit Price:",
    teamsHiredSteersman: "Teams hired Official Steersman during practice",
    teamsNotHiredSteersman: "Teams DID NOT hire Official Steersman during practice",
    
    // WU/SC specific
    divisionLabel: "Division",
    entryGroupLabel: "Entry Group",

    // ============================================
    // PLACEHOLDERS
    // ============================================
    
    pleaseChoose: "-- Please choose --",
    selectPlaceholder: "-- Select --",
    alreadySelected: "already selected",
    selectNumberOfTeams: "-- Select number of teams --",
    selectCategory: "-- Select category --",
    enterTeamName: "Enter team name",
    enterOrgName: "Enter organization or group name",
    enterCompleteAddress: "Enter complete address",
    enterFullName: "Enter full name",
    eightDigitNumber: "8-digit number",
    enterEmailAddress: "Enter email address",
    exampleTwo: "e.g. 2",
    addressPlaceholder: "Room/Floor, Building Name, Street, District, City",
    optionalText: "(Optional)",
    additionalNotes: "Additional notes (optional)",

    // ============================================
    // CATEGORY OPTIONS (Fallback - usually from DB)
    // ============================================
    
    menOpen: "Men Open",
    ladiesOpen: "Ladies Open",
    mixedOpen: "Mixed Open",
    mixedCorporate: "Mixed Corporate",
    openDivisionMen: "Open Division – Men",
    openDivisionLadies: "Open Division – Ladies",
    mixedDivisionOpen: "Mixed Division – Open",
    mixedDivisionCorporate: "Mixed Division – Corporate",

    // ============================================
    // PACKAGE CONTENT LABELS
    // ============================================
    
    entryFee: "Entry Fee",
    practiceWithEquipment: "Practice with equipment x{hours}hrs",
    souvenirTee: "Souvenir Tee x{qty} pieces",
    dryBag: "{size}L Dry Bag x{qty}",
    paddedShorts: "Padded Shorts x{qty} pieces",
    perTeam: "per team",
    howManyTeamsChooseOption: "How many teams choose {option}:",
    
    // Package details (dynamic)
    practiceHours: "Practice: {hours} hours",
    tShirts: "T-Shirts: {qty} pieces",
    paddedShortsQty: "Padded Shorts: {qty} pieces",
    dryBagsQty: "Dry Bags: {qty} piece",

    // ============================================
    // CALENDAR & PRACTICE LABELS
    // ============================================
    
    // Ranking table
    rank: "Rank",
    twoHourSession: "2-Hour Session",
    oneHourSession: "1-Hour Session",
    firstChoice: "1st Choice",
    secondChoice: "2nd Choice",
    thirdChoice: "3rd Choice",
    
    // Weekday abbreviations
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    
    // Duration options
    oneHour: "1h",
    twoHours: "2h",
    
    // Steersman & Coach options
    steersmanCoachNone: "None",
    steersmanCoachS: "Steersman (S)",
    steersmanCoachT: "Trainer (T)",
    steersmanCoachST: "Steersman & Trainer (ST)",
    
    // DEPRECATED: Keep for backward compatibility - Use steersmanCoach* keys instead
    helperNone: "NONE",  // DEPRECATED: Use steersmanCoachNone
    helperS: "S",        // DEPRECATED: Use steersmanCoachS
    helperT: "T",        // DEPRECATED: Use steersmanCoachT
    helperST: "ST",      // DEPRECATED: Use steersmanCoachST
    
    // Practice summary
    totalHoursSelected: "Total Hours Selected:",
    extraPracticeSessions: "Extra Practice Sessions",
    trainerSessions: "Trainer Sessions",
    steersmanSessions: "Steersman Sessions",
    practiceHoursMinimum: "Total practice hours: {hours}h (minimum {min}h required)",

    // ============================================
    // SUMMARY PAGE LABELS
    // ============================================
    
    basics: "Basics",
    season: "Season",
    organization: "Organization",
    teams: "Teams",
    teamName: "Team Name",
    entryOption: "Entry Option",
    noTeams: "No teams",
    teamCodesAssignedNote: "(Team codes are assigned at submit time.)",
    teamManagers: "Team Managers",
    name: "Name",
    mobile: "Mobile",
    email: "Email",
    noManagerInformation: "No manager information",
    marqueeQty: "Marquee Qty",
    steersmanWithBoat: "Steersman (with boat)",
    steersmanNoBoat: "Steersman (no boat)",
    junkBoatQty: "Junk Boat # / Qty",
    speedBoatQty: "Speed Boat # / Qty",
    practiceBookingPerTeam: "Practice Booking (per Team)",
    noPracticeBookingData: "No practice booking data.",
    
    // WU/SC Summary
    division: "Division",
    entryGroup: "Entry Group",
    totalAmount: "Total Amount",
    totalCost: "Total Cost",
    
    // Summary placeholders
    emDash: "—",
    notApplicable: "N/A",

    // ============================================
    // SUCCESS PAGE LABELS
    // ============================================
    
    registrationIdLabel: "Registration ID:",
    teamCodesLabel: "Team Codes:",
    confirmationEmailLabel: "Confirmation Email:",
    registrationConfirmation: "Registration Confirmation",

    // ============================================
    // VALIDATION MESSAGES
    // ============================================
    
    // Required field errors
    requiredField: "This field is required",
    pleaseSelectNumberOfTeams: "Please select number of teams",
    pleaseEnterTeamName: "Please enter team name for Team {num}",
    pleaseSelectCategory: "Please select category for Team {num}",
    pleaseSelectEntryOption: "Please select entry option for Team {num}",
    pleaseSelectDivision: "Please select Division for Team {num}",
    pleaseSelectEntryGroup: "Please select Entry Group for Team {num}",
    
    // Organization validation
    pleaseEnterOrgName: "Please enter organization name",
    pleaseEnterMailingAddress: "Please enter mailing address",
    
    // Manager validation
    pleaseEnterManagerName: "Please enter Team Manager {num} name",
    pleaseEnterManagerPhone: "Please enter Team Manager {num} phone",
    pleaseEnterManagerEmail: "Please enter Team Manager {num} email",
    managerPhoneInvalid: "Team Manager {num} phone must be an 8-digit Hong Kong number",
    managerEmailInvalid: "Team Manager {num} email is invalid",
    managerPhoneProvidedNoName: "Please enter Team Manager {num} name",
    
    // Field-level validation
    invalidEmailError: "Please enter a valid email address.",
    invalidPhoneError: "Please enter an 8-digit Hong Kong phone number.",
    minLengthError: "Minimum length is {min} characters",
    maxLengthError: "Maximum length is {max} characters",
    invalidFormatError: "Invalid format",
    
    // Duplicate validation
    duplicateTeamNamesWarning: "Warning: Duplicate team names found in the same category. Please use unique names.",
    
    // Configuration errors
    configNotLoaded: "Configuration not loaded. Please refresh the page.",
    noBoatTypesConfigured: "Configuration Issue: No boat types are configured in the database.",
    pleaseContactAdmin: "Please contact the administrator to set up packages and divisions for this event.",
    noEntryGroupsAvailable: "No entry groups available for {boatType}. Please contact support.",
    noPackagesConfigured: "No boat types configured.",
    noPackagesConfiguredDetail: "The database may not have packages set up for this event. Please contact the administrator.",

    // ============================================
    // STATUS MESSAGES
    // ============================================
    
    loadingText: "Loading...",
    submittingText: "Submitting...",
    processingText: "Processing...",
    
    // Rate limiting
    pleaseWaitBeforeSubmitting: "Please wait before submitting again. You can submit {max} times per minute. Please wait {time}.",
    submissionsUsed: "{used} of {max} submissions used",
    
    // Time formatting
    second: "second",
    seconds: "seconds",
    minute: "minute",
    minutes: "minutes",
    
    // Units
    hours: "hours",
    pieces: "pieces",
    piece: "piece",
    hkDollar: "HK$",

    // ============================================
    // ERROR MESSAGES (Server Error Codes)
    // ============================================
    
    errorEventDisabled: "This event is currently not accepting registrations.",
    errorDivisionInactive: "That division is not open.",
    errorPackageInactive: "Selected package is unavailable.",
    errorQtyLimit: "Quantity exceeds the allowed limit.",
    errorPracticeWindow: "Selected practice date is outside the allowed window.",
    errorSlotInvalid: "Selected practice time slot is invalid.",
    errorDuplicate: "A submission with the same details already exists.",
    errorHoneypot: "Submission blocked. Please try again.",
    errorRateLimit: "Too many attempts. Please wait a minute and try again.",
    errorBadPayload: "Your submission looks incomplete. Please review and resubmit.",
    errorUnknown: "Something went wrong. Please try again.",
    
    // Network/System errors
    networkError: "Network error. Please try again.",
    networkErrorCheck: "Network error. Please check your connection.",
    serverError: "Server error. Please try again later.",
    timeoutError: "Request timed out. Please try again.",
    unableToLoadEvents: "Unable to load events. Please try again later.",
    unableToLoadRaceDayItems: "Unable to load race day items. Please try again later.",

    // ============================================
    // ERROR SYSTEM MESSAGES (Phase 2)
    // ============================================
    
    // General error messages
    pleaseCorrectErrors: "Please correct the following errors:",
    dismissErrors: "Dismiss errors",
    close: "Close",
    closeError: "Close error",
    closeErrorSummary: "Close error summary",
    systemError: "System Error",
    systemErrorTitle: "System Error",
    formErrorsTitle: "Please correct the following errors:",
    
    // Field validation messages
    fieldRequired: "This field is required",
    invalidEmail: "Please enter a valid email address",
    invalidPhone: "Please enter an 8-digit Hong Kong phone number",
    duplicateTeamName: "Team name must be unique",
    
    // Specific field validation messages
    teamNameRequired: "Team name is required",
    categoryRequired: "Please select a race category",
    entryOptionRequired: "Please select an entry option",
    organizationRequired: "Organization name is required",
    addressRequired: "Address is required",
    managerNameRequired: "Manager name is required",
    managerPhoneRequired: "Manager phone is required",
    managerEmailRequired: "Manager email is required",
    
    // Quantity validation messages
    quantityMustBePositive: "Quantity must be at least {min}",
    quantityExceedsMax: "Quantity cannot exceed {max}",
    
    // Practice validation messages
    practiceSelectionRequired: "Please select practice date(s) for Team {teamNum}: {teamName}",
    durationRequired: "Please select practice duration for Team {teamNum}: {teamName}",
    steersmanCoachRequired: "Please select steersman & coach requirement for Team {teamNum}: {teamName}",
    // DEPRECATED: Keep for backward compatibility - Use steersmanCoachRequired instead
    helperRequired: "Please select helper requirement for Team {teamNum}: {teamName}",  // DEPRECATED: Use steersmanCoachRequired
    practiceMinimumRequired: "Please select at least 12 hours of practice session(s) for Team {teamNum}: {teamName}",
    practiceTimeSlotRequired: "Team {teamNum} ({teamName}): Please select at least one time slot preference",
    practiceDateInvalid: "Team {teamNum} ({teamName}): Practice date {dateIndex} is missing or invalid",
    practiceDurationInvalid: "Team {teamNum} ({teamName}): Practice date {dateIndex} duration must be 1h or 2h",
    practiceSteersmanCoachRequired: "Team {teamNum} ({teamName}): Practice date {dateIndex} steersman & coach selection required",
    // DEPRECATED: Keep for backward compatibility - Use practiceSteersmanCoachRequired instead
    practiceHelperRequired: "Team {teamNum} ({teamName}): Practice date {dateIndex} helper selection required",  // DEPRECATED: Use practiceSteersmanCoachRequired
    practiceHoursMinimum: "Team {teamNum} ({teamName}): Total practice hours ({hours}h) must be at least {min}h",
    duplicateSlotSelection: "This time slot is already selected in another preference",
    practiceDateWeekdayError: "One or more practice dates are not on allowed weekdays. Please select weekdays only.",
    practiceDateWindowError: "One or more practice dates are outside the allowed practice window.",
    
    // Server error messages (enhanced)
    serverErrorDetailed: "Unable to process your request. Please try again later.",
    networkErrorDetailed: "Network connection error. Please check your connection and try again.",
    rateLimitExceeded: "Too many attempts. Please wait a few minutes and try again.",
    duplicateRegistration: "This registration already exists. Please contact support if you need assistance.",
    timeoutErrorDetailed: "Request timeout. Please try again.",

    // ============================================
    // MISC & COMMON WORDS
    // ============================================
    
    yesText: "Yes",
    noText: "No",
    totalText: "Total",
    subtotalText: "Subtotal",
    quantityText: "Quantity",
    priceText: "Price",
    amountText: "Amount",
    dateText: "Date",
    timeText: "Time",
    requiredAsterisk: "*",
    
    // Table headers
    numberSymbol: "#",
  },
  
  zh: {
    // ============================================
    // NAVIGATION & BUTTONS
    // ============================================
    
    // Generic navigation
    nextButton: "下一步 →",
    previousButton: "← 上一步",
    backButton: "← 返回",
    submitButton: "提交申請",
    cancelButton: "取消",
    confirmButton: "確認",
    editButton: "編輯",
    saveButton: "儲存",
    closeButton: "關閉",
    goNowButton: "立即前往",
    
    // Step-specific navigation (TN Wizard)
    nextTeamInfo: "下一步：隊伍資料 →",
    backTeamSelection: "← 返回：隊伍選擇",
    nextRaceDay: "下一步：賽事日安排 →",
    backTeamInfo: "← 返回：隊伍資料",
    nextPractice: "下一步：練習預約 →",
    backRaceDay: "← 返回：賽事日",
    nextSummary: "下一步：摘要 →",
    backPractice: "← 返回：練習",
    
    // Action buttons
    copyDetails: "複製詳情",
    copyFromTeam1: "從第1隊複製",
    clearCacheReload: "清除緩存並重新載入",
    clickToSelect: "點擊選擇",
    selected: "已選擇",
    copiedSuccess: "已複製！",

    // ============================================
    // STEPPER STEPS (TN Wizard - 5 steps)
    // ============================================
    
    tnStep1: "1. 隊伍",
    tnStep2: "2. 聯絡人",
    tnStep3: "3. 賽事日",
    tnStep4: "4. 練習",
    tnStep5: "5. 摘要",
    
    // ============================================
    // STEPPER STEPS (WU/SC Wizard - 4 steps)
    // ============================================
    
    wuScStep1: "1. 隊伍",
    wuScStep2: "2. 聯絡人",
    wuScStep3: "3. 賽事日",
    wuScStep4: "4. 摘要",

    // ============================================
    // PAGE TITLES & HEADINGS
    // ============================================
    
    // Main page
    stanleyDragonBoatAssociation: "赤柱龍舟協會",
    raceRegistration: "賽事報名",
    selectRacePrompt: "請選擇您想報名的賽事：",
    
    // Race Info page (before step 1)
    raceInfoTitle: "賽事資訊",
    raceInfoEvent: "賽事",
    raceInfoDate: "日期",
    raceInfoTime: "時間",
    raceInfoVenue: "地點",
    raceInfoCourse: "賽道",
    raceInfoDeadline: "截止報名日期",
    raceInfoAppendix: "參賽附錄",
    raceInfoClickHere: "按此",
    raceInfoNext: "下一步",
    
    // Success page
    applicationSubmittedSuccess: "申請已成功提交！",
    thankYouMessage: "感謝您的報名。我們已收到您的申請。",
    registrationDetails: "報名詳情",
    redirectingMessage: "{seconds} 秒後將重新導向至賽事選擇...",
    saveRecordsMessage: "請儲存您的報名編號及隊伍代碼以作記錄。",
    
    // Step headings (TN)
    selectRaceCategory: "選擇賽事組別",
    teamInformation: "隊伍資料",
    raceDayArrangement: "賽事日安排",
    practiceBookingTitle: "練習預約（{startMonth}–{endMonth}）",
    practiceBookingTitleFallback: "練習預約",
    applicationSummary: "申請摘要",
    
    // Step headings (WU/SC)
    selectTeamDetails: "隊伍詳情",
    
    // Section headings
    organizationManagerInfo: "機構及隊伍管理員資料",
    organizationGroupInfo: "機構/團體資料",
    teamManager1Required: "隊伍管理員1（必填）",
    teamManager2Required: "隊伍管理員2（必填）",
    teamManager3Optional: "隊伍管理員3（選填）",
    raceDayArrangements: "賽事日安排",
    timeSlotPreferenceRanking: "時段偏好排序",
    practiceBookingSummary: "練習預約摘要",
    entryOptions: "報名選項",

    // ============================================
    // FORM LABELS
    // ============================================
    
    // Team selection
    chooseCategory: "選擇組別：",
    howManyTeams: "您將報名多少隊伍？",
    howManyTeamsQuestion: "您想報名多少隊伍？",
    oneTeam: "1 隊",
    nTeams: "{count} 隊",
    teamLabel: "第 {num} 隊",
    teamNameLabel: "隊名 *",
    teamNameEnLabel: "隊伍名稱(英文)",
    teamNameTcLabel: "隊伍名稱(中文)",
    teamNameEnPlaceholder: "請提供隊名",
    teamNameTcPlaceholder: "選填",
    raceCategoryLabel: "賽事組別 *",
    entryOptionLabel: "報名選項 *",
    selectTeamLabel: "選擇隊伍：",
    nowScheduling: "正在安排：{teamName}",

    // Organization
    organizationGroupName: "機構 / 團體名稱*",
    organizationGroupNameShort: "機構/團體名稱 *",
    mailingAddress: "郵寄地址*",
    addressLabel: "地址 *",
    teamManagerContact: "隊伍管理員聯絡",
    
    // Manager fields
    nameLabel: "姓名 *",
    nameLabelOptional: "姓名",
    phoneLabel: "電話 *",
    phoneLabelOptional: "電話",
    emailLabel: "電郵 *",
    emailLabelOptional: "電郵",
    
    // Race day items
    raceDayItems: "賽日項目",
    athleteMarquee: "運動員帳篷",
    officialSteersman: "官方舵手",
    junkRegistration: "遊艇登記",
    speedBoatRegistration: "快艇登記",
    pleasureBoatNo: "遊艇編號：",
    speedBoatNo: "快艇編號：",
    unitPrice: "單價：",
    teamsHiredSteersman: "隊伍於練習期間聘請官方舵手",
    teamsNotHiredSteersman: "隊伍於練習期間沒有聘請官方舵手",
    
    // WU/SC specific
    divisionLabel: "組別",
    entryGroupLabel: "參賽組別",

    // ============================================
    // PLACEHOLDERS
    // ============================================
    
    pleaseChoose: "-- 請選擇 --",
    selectPlaceholder: "-- 選擇 --",
    alreadySelected: "已選擇",
    selectNumberOfTeams: "-- 選擇隊伍數量 --",
    selectCategory: "-- 選擇組別 --",
    enterTeamName: "輸入隊名",
    enterOrgName: "輸入機構或團體名稱",
    enterCompleteAddress: "輸入完整地址",
    enterFullName: "輸入姓名",
    eightDigitNumber: "8位數字",
    enterEmailAddress: "輸入電郵地址",
    exampleTwo: "例如：2",
    addressPlaceholder: "室/樓層、大廈名稱、街道、地區、城市",
    optionalText: "（選填）",
    additionalNotes: "附加說明（選填）",

    // ============================================
    // CATEGORY OPTIONS (Fallback - usually from DB)
    // ============================================
    
    menOpen: "男子公開組",
    ladiesOpen: "女子公開組",
    mixedOpen: "混合公開組",
    mixedCorporate: "混合企業組",
    openDivisionMen: "公開組 – 男子",
    openDivisionLadies: "公開組 – 女子",
    mixedDivisionOpen: "混合組 – 公開",
    mixedDivisionCorporate: "混合組 – 企業",

    // ============================================
    // PACKAGE CONTENT LABELS
    // ============================================
    
    entryFee: "報名費",
    practiceWithEquipment: "練習連設備 x{hours}小時",
    souvenirTee: "紀念T恤 x{qty}件",
    dryBag: "{size}L防水袋 x{qty}",
    paddedShorts: "運動短褲 x{qty}件",
    perTeam: "每隊",
    howManyTeamsChooseOption: "多少隊選擇{option}：",
    
    // Package details (dynamic)
    practiceHours: "練習：{hours}小時",
    tShirts: "T恤：{qty}件",
    paddedShortsQty: "運動短褲：{qty}件",
    dryBagsQty: "防水袋：{qty}件",

    // ============================================
    // CALENDAR & PRACTICE LABELS
    // ============================================
    
    // Ranking table
    rank: "排序",
    twoHourSession: "2小時時段",
    oneHourSession: "1小時時段",
    firstChoice: "第一選擇",
    secondChoice: "第二選擇",
    thirdChoice: "第三選擇",
    
    // Weekday abbreviations
    sun: "日",
    mon: "一",
    tue: "二",
    wed: "三",
    thu: "四",
    fri: "五",
    sat: "六",
    
    // Duration options
    oneHour: "1小時",
    twoHours: "2小時",
    
    // Steersman & Coach options
    steersmanCoachNone: "不需要",
    steersmanCoachS: "舵手 (S)",
    steersmanCoachT: "教練 (T)",
    steersmanCoachST: "舵手及教練 (ST)",
    
    // DEPRECATED: Keep for backward compatibility - Use steersmanCoach* keys instead
    helperNone: "無",      // DEPRECATED: Use steersmanCoachNone
    helperS: "舵",         // DEPRECATED: Use steersmanCoachS
    helperT: "教",         // DEPRECATED: Use steersmanCoachT
    helperST: "舵教",      // DEPRECATED: Use steersmanCoachST
    
    // Practice summary
    totalHoursSelected: "已選總時數：",
    extraPracticeSessions: "額外練習時段",
    trainerSessions: "教練時段",
    steersmanSessions: "舵手時段",
    practiceHoursMinimum: "練習總時數：{hours}小時（最少需要 {min} 小時）",

    // ============================================
    // SUMMARY PAGE LABELS
    // ============================================
    
    basics: "基本資料",
    season: "賽季",
    organization: "機構",
    teams: "隊伍",
    teamName: "隊名",
    entryOption: "報名選項",
    noTeams: "沒有隊伍",
    teamCodesAssignedNote: "（隊伍代碼將於提交時分配。）",
    teamManagers: "隊伍管理員",
    name: "姓名",
    mobile: "手提電話",
    email: "電郵",
    noManagerInformation: "沒有管理員資料",
    marqueeQty: "帳篷數量",
    steersmanWithBoat: "舵手（連船）",
    steersmanNoBoat: "舵手（不連船）",
    junkBoatQty: "遊艇編號 / 數量",
    speedBoatQty: "快艇編號 / 數量",
    practiceBookingPerTeam: "練習預約（每隊）",
    noPracticeBookingData: "沒有練習預約資料。",
    
    // WU/SC Summary
    division: "組別",
    entryGroup: "參賽組別",
    totalAmount: "總金額",
    totalCost: "總費用",
    
    // Summary placeholders
    emDash: "—",
    notApplicable: "不適用",

    // ============================================
    // SUCCESS PAGE LABELS
    // ============================================
    
    registrationIdLabel: "報名編號：",
    teamCodesLabel: "隊伍代碼：",
    confirmationEmailLabel: "確認電郵：",
    registrationConfirmation: "報名確認",

    // ============================================
    // VALIDATION MESSAGES
    // ============================================
    
    // Required field errors
    requiredField: "此欄位為必填",
    pleaseSelectNumberOfTeams: "請選擇隊伍數量",
    pleaseEnterTeamName: "請輸入第 {num} 隊的隊名",
    pleaseSelectCategory: "請選擇第 {num} 隊的組別",
    pleaseSelectEntryOption: "請選擇第 {num} 隊的報名選項",
    pleaseSelectDivision: "請選擇第 {num} 隊的組別",
    pleaseSelectEntryGroup: "請選擇第 {num} 隊的參賽組別",
    
    // Organization validation
    pleaseEnterOrgName: "請輸入機構名稱",
    pleaseEnterMailingAddress: "請輸入郵寄地址",
    
    // Manager validation
    pleaseEnterManagerName: "請輸入隊伍管理員 {num} 的姓名",
    pleaseEnterManagerPhone: "請輸入隊伍管理員 {num} 的電話",
    pleaseEnterManagerEmail: "請輸入隊伍管理員 {num} 的電郵",
    managerPhoneInvalid: "隊伍管理員 {num} 的電話必須為8位數字的香港電話號碼",
    managerEmailInvalid: "隊伍管理員 {num} 的電郵無效",
    managerPhoneProvidedNoName: "請輸入隊伍管理員 {num} 的姓名",
    
    // Field-level validation
    invalidEmailError: "請輸入有效的電郵地址。",
    invalidPhoneError: "請輸入8位數字的香港電話號碼。",
    minLengthError: "最少需要 {min} 個字元",
    maxLengthError: "最多 {max} 個字元",
    invalidFormatError: "格式無效",
    
    // Duplicate validation
    duplicateTeamNamesWarning: "警告：在同一組別中發現重複的隊名。請使用不同的隊名。",
    
    // Configuration errors
    configNotLoaded: "配置未載入。請重新整理頁面。",
    noBoatTypesConfigured: "配置問題：資料庫中沒有配置船隻類型。",
    pleaseContactAdmin: "請聯絡管理員為此賽事設置套餐及組別。",
    noEntryGroupsAvailable: "沒有可用的 {boatType} 參賽組別。請聯絡支援。",
    noPackagesConfigured: "沒有配置船隻類型。",
    noPackagesConfiguredDetail: "資料庫可能沒有為此賽事設置套餐。請聯絡管理員。",

    // ============================================
    // STATUS MESSAGES
    // ============================================
    
    loadingText: "載入中...",
    submittingText: "提交中...",
    processingText: "處理中...",
    
    // Rate limiting
    pleaseWaitBeforeSubmitting: "請稍候再提交。您可以每分鐘提交 {max} 次。請等待 {time}。",
    submissionsUsed: "已使用 {used} / {max} 次提交",
    
    // Time formatting
    second: "秒",
    seconds: "秒",
    minute: "分鐘",
    minutes: "分鐘",
    
    // Units
    hours: "小時",
    pieces: "件",
    piece: "件",
    hkDollar: "HK$",

    // ============================================
    // ERROR MESSAGES (Server Error Codes)
    // ============================================
    
    errorEventDisabled: "此賽事目前不接受報名。",
    errorDivisionInactive: "該組別未開放。",
    errorPackageInactive: "所選套餐不可用。",
    errorQtyLimit: "數量超出允許上限。",
    errorPracticeWindow: "所選練習日期超出允許範圍。",
    errorSlotInvalid: "所選練習時段無效。",
    errorDuplicate: "已存在相同詳情的提交。",
    errorHoneypot: "提交被阻止。請重試。",
    errorRateLimit: "嘗試次數過多。請稍候一分鐘再試。",
    errorBadPayload: "您的提交似乎不完整。請檢查後重新提交。",
    errorUnknown: "發生錯誤。請重試。",
    
    // Network/System errors
    networkError: "網絡錯誤。請重試。",
    networkErrorCheck: "網絡錯誤。請檢查您的連線。",
    serverError: "伺服器錯誤。請稍後再試。",
    timeoutError: "請求逾時。請重試。",
    unableToLoadEvents: "無法載入賽事。請稍後再試。",
    unableToLoadRaceDayItems: "無法載入賽事日項目。請稍後再試。",

    // ============================================
    // ERROR SYSTEM MESSAGES (Phase 2)
    // ============================================
    
    // General error messages
    pleaseCorrectErrors: "請更正以下錯誤：",
    dismissErrors: "關閉錯誤",
    close: "關閉",
    closeError: "關閉錯誤",
    closeErrorSummary: "關閉錯誤摘要",
    systemError: "系統錯誤",
    systemErrorTitle: "系統錯誤",
    formErrorsTitle: "請更正以下錯誤：",
    
    // Field validation messages
    fieldRequired: "此欄位為必填",
    invalidEmail: "請輸入有效的電郵地址",
    invalidPhone: "請輸入8位數字的香港電話號碼",
    duplicateTeamName: "隊伍名稱必須唯一",
    
    // Specific field validation messages
    teamNameRequired: "隊伍名稱為必填",
    categoryRequired: "請選擇比賽組別",
    entryOptionRequired: "請選擇參賽選項",
    organizationRequired: "機構名稱為必填",
    addressRequired: "地址為必填",
    managerNameRequired: "負責人姓名為必填",
    managerPhoneRequired: "負責人電話為必填",
    managerEmailRequired: "負責人電郵為必填",
    
    // Quantity validation messages
    quantityMustBePositive: "數量必須至少為 {min}",
    quantityExceedsMax: "數量不能超過 {max}",
    
    // Practice validation messages
    practiceSelectionRequired: "請為第 {teamNum} 隊：{teamName} 選擇訓練日期",
    durationRequired: "請為第 {teamNum} 隊：{teamName} 選擇訓練時長",
    steersmanCoachRequired: "請為第 {teamNum} 隊：{teamName} 選擇是否需要舵手及教練",
    // DEPRECATED: Keep for backward compatibility - Use steersmanCoachRequired instead
    helperRequired: "請為第 {teamNum} 隊：{teamName} 選擇是否需要舵手教練",  // DEPRECATED: Use steersmanCoachRequired
    practiceMinimumRequired: "請為第 {teamNum} 隊：{teamName} 選擇至少12小時的訓練時段",
    practiceTimeSlotRequired: "第 {teamNum} 隊 ({teamName})：請選擇至少一個時段偏好",
    practiceDateInvalid: "第 {teamNum} 隊 ({teamName})：訓練日期 {dateIndex} 缺失或無效",
    practiceDurationInvalid: "第 {teamNum} 隊 ({teamName})：訓練日期 {dateIndex} 的時長必須為 1 小時或 2 小時",
    practiceSteersmanCoachRequired: "第 {teamNum} 隊 ({teamName})：訓練日期 {dateIndex} 需要選擇舵手及教練",
    // DEPRECATED: Keep for backward compatibility - Use practiceSteersmanCoachRequired instead
    practiceHelperRequired: "第 {teamNum} 隊 ({teamName})：訓練日期 {dateIndex} 需要選擇舵手教練",  // DEPRECATED: Use practiceSteersmanCoachRequired
    practiceHoursMinimum: "第 {teamNum} 隊 ({teamName})：總訓練時數 ({hours} 小時) 必須至少為 {min} 小時",
    duplicateSlotSelection: "此時段已在其他偏好中選擇",
    practiceDateWeekdayError: "一個或多個練習日期不在允許的工作日。請僅選擇工作日。",
    practiceDateWindowError: "一個或多個練習日期超出允許的練習時間範圍。",
    
    // Server error messages (enhanced)
    serverErrorDetailed: "無法處理您的請求，請稍後再試。",
    networkErrorDetailed: "網絡連接錯誤，請檢查您的連接並重試。",
    rateLimitExceeded: "嘗試次數過多，請稍候幾分鐘後再試。",
    duplicateRegistration: "此註冊已存在，如需協助請聯絡客戶服務。",
    timeoutErrorDetailed: "請求超時，請重試。",

    // ============================================
    // MISC & COMMON WORDS
    // ============================================
    
    yesText: "是",
    noText: "否",
    totalText: "總計",
    subtotalText: "小計",
    quantityText: "數量",
    priceText: "價格",
    amountText: "金額",
    dateText: "日期",
    timeText: "時間",
    requiredAsterisk: "*",
    
    // Table headers
    numberSymbol: "#",
  }
};

// ============================================
// ERROR CODE MAPPING
// ============================================

/**
 * Maps server error codes to translation keys
 * Used by submit.js mapError() function
 */
const errorCodeMap = {
  'E.EVENT_DISABLED': 'errorEventDisabled',
  'E.DIVISION_INACTIVE': 'errorDivisionInactive',
  'E.PACKAGE_INACTIVE': 'errorPackageInactive',
  'E.QTY_LIMIT': 'errorQtyLimit',
  'E.PRACTICE_WINDOW': 'errorPracticeWindow',
  'E.SLOT_INVALID': 'errorSlotInvalid',
  'E.DUPLICATE': 'errorDuplicate',
  'E.HONEYPOT': 'errorHoneypot',
  'E.RATE_LIMIT': 'errorRateLimit',
  'E.BAD_PAYLOAD': 'errorBadPayload',
  'E.UNKNOWN': 'errorUnknown'
};

// ============================================
// EXPORTS - Universal Module Definition (UMD)
// ============================================

// Make available globally FIRST (for regular script loading)
if (typeof window !== 'undefined') {
  window.translations = translations;
  window.errorCodeMap = errorCodeMap;
}

// CommonJS export (for Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { translations, errorCodeMap };
}

// Note: For ES Module usage, load with type="module" and use:
// import { translations, errorCodeMap } from './translations.js';
// The exports below only work when loaded as a module.
// When loaded as a regular script, they are ignored due to the check.