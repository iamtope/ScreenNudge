import FamilyControls
import Foundation

private let dailyActivity = "pull-daily"
private let passActivity = "pull-pass"
private let focusActivity = "pull-focus"
private let selectionId = "pull-main"
private let dailyEvent = "limit_reached"
/// Fires at the goal the streak is judged against, which can differ from the
/// blocking limit for the rest of the day after the user raises it.
private let streakEvent = "streak_goal"
private let protectionEnabledKey = "pull:protectionEnabled"
private let dailyReachedDayKey = "pull:dailyLimitReachedDay"
private let streakBreachedDayKey = "pull:streakBreachedDay"
private let streakLedgerKey = "pull:streakLedger"
private let streakLedgerLimit = 120
private let passUntilKey = "pull:reblockAt"
private let focusUntilKey = "pull:focusUntil"
private let bedtimeEnabledKey = "pull:bedtimeEnabled"
private let bedtimeStartKey = "pull:bedtimeStart"
private let bedtimeEndKey = "pull:bedtimeEnd"

private func localDateKey(_ date: Date = Date()) -> String {
  let components = Calendar.current.dateComponents([.year, .month, .day], from: date)
  return String(
    format: "%04d-%02d-%02d",
    components.year ?? 0,
    components.month ?? 0,
    components.day ?? 0
  )
}

private func localDateKey(timestampMs: Double) -> String {
  localDateKey(Date(timeIntervalSince1970: timestampMs / 1000))
}

private func isInsideWindow(start: Int, end: Int, date: Date = Date()) -> Bool {
  let components = Calendar.current.dateComponents([.hour, .minute], from: date)
  let minute = (components.hour ?? 0) * 60 + (components.minute ?? 0)
  let normalizedStart = ((start % 1440) + 1440) % 1440
  let normalizedEnd = ((end % 1440) + 1440) % 1440
  if normalizedStart <= normalizedEnd {
    return minute >= normalizedStart && minute < normalizedEnd
  }
  return minute >= normalizedStart || minute < normalizedEnd
}

private func dailyLimitReachedToday() -> Bool {
  if userDefaults?.string(forKey: dailyReachedDayKey) == localDateKey() {
    return true
  }
  let eventKey = userDefaultKeyForEvent(
    activityName: dailyActivity,
    callbackName: "eventDidReachThreshold",
    eventName: dailyEvent
  )
  if let timestamp = userDefaults?.object(forKey: eventKey) as? Double {
    return localDateKey(timestampMs: timestamp) == localDateKey()
  }
  return false
}

/// Days the streak goal was exceeded, as `{"2026-08-01": true}`.
///
/// Written here rather than in the app because this extension runs whether or not
/// the app is ever opened — reconstructing history later from a single
/// "last breached day" marker would silently miss consecutive missed days.
private func readStreakLedger() -> [String: Bool] {
  guard let raw = userDefaults?.string(forKey: streakLedgerKey),
    let data = raw.data(using: .utf8),
    let parsed = try? JSONDecoder().decode([String: Bool].self, from: data)
  else {
    return [:]
  }
  return parsed
}

private func writeStreakLedger(_ ledger: [String: Bool]) {
  // Keep the newest days only; the streak never needs more history than this.
  var trimmed = ledger
  if trimmed.count > streakLedgerLimit {
    let keep = Set(trimmed.keys.sorted().suffix(streakLedgerLimit))
    trimmed = trimmed.filter { keep.contains($0.key) }
  }
  guard let data = try? JSONEncoder().encode(trimmed),
    let encoded = String(data: data, encoding: .utf8)
  else {
    return
  }
  userDefaults?.set(encoded, forKey: streakLedgerKey)
}

private func recordStreakDay(_ day: String, breached: Bool) {
  var ledger = readStreakLedger()
  // Once a day is breached it stays breached, whatever else happens that day.
  if ledger[day] == true && !breached {
    return
  }
  ledger[day] = breached
  writeStreakLedger(ledger)
}

func prepareScreenNudgeProtectionCallback(
  activityName: String,
  callbackName: String,
  eventName: String? = nil
) {
  if callbackName == "eventDidReachThreshold",
    activityName == dailyActivity,
    eventName == dailyEvent
  {
    userDefaults?.set(localDateKey(), forKey: dailyReachedDayKey)
  }
  if callbackName == "eventDidReachThreshold",
    activityName == dailyActivity,
    eventName == streakEvent
  {
    let today = localDateKey()
    userDefaults?.set(today, forKey: streakBreachedDayKey)
    recordStreakDay(today, breached: true)
  }
  // The daily activity's interval ends at 23:59:59, so this seals the day: no
  // breach recorded by now means the goal was kept.
  if callbackName == "intervalDidEnd", activityName == dailyActivity {
    let today = localDateKey()
    recordStreakDay(today, breached: userDefaults?.string(forKey: streakBreachedDayKey) == today)
  }
  if callbackName == "intervalDidEnd" && activityName == passActivity {
    userDefaults?.removeObject(forKey: passUntilKey)
  }
  if callbackName == "intervalDidEnd" && activityName == focusActivity {
    userDefaults?.removeObject(forKey: focusUntilKey)
  }
}

@available(iOS 15.0, *)
func reconcileScreenNudgeProtection(triggeredBy: String) {
  guard userDefaults?.bool(forKey: protectionEnabledKey) == true,
    let selection = getFamilyActivitySelectionById(id: selectionId)
  else {
    return
  }

  let nowMs = Date().timeIntervalSince1970 * 1000
  let focusUntil = userDefaults?.double(forKey: focusUntilKey) ?? 0
  let passUntil = userDefaults?.double(forKey: passUntilKey) ?? 0
  let bedtimeEnabled = userDefaults?.bool(forKey: bedtimeEnabledKey) ?? false
  let bedtimeStart = userDefaults?.integer(forKey: bedtimeStartKey) ?? 0
  let bedtimeEnd = userDefaults?.integer(forKey: bedtimeEndKey) ?? 0
  let focusActive = focusUntil > nowMs
  let bedtimeActive =
    bedtimeEnabled && isInsideWindow(start: bedtimeStart, end: bedtimeEnd)
  let dailyActive = dailyLimitReachedToday() && passUntil <= nowMs

  if focusUntil > 0 && !focusActive {
    userDefaults?.removeObject(forKey: focusUntilKey)
  }
  if passUntil > 0 && passUntil <= nowMs {
    userDefaults?.removeObject(forKey: passUntilKey)
  }

  if focusActive {
    updateShield(
      shieldId: "focus",
      triggeredBy: triggeredBy,
      activitySelectionId: selectionId
    )
    blockSelectedApps(blockSelection: selection, triggeredBy: triggeredBy)
    return
  }
  if bedtimeActive {
    updateShield(
      shieldId: "bedtime",
      triggeredBy: triggeredBy,
      activitySelectionId: selectionId
    )
    blockSelectedApps(blockSelection: selection, triggeredBy: triggeredBy)
    return
  }
  if dailyActive {
    updateShield(
      shieldId: "daily",
      triggeredBy: triggeredBy,
      activitySelectionId: selectionId
    )
    blockSelectedApps(blockSelection: selection, triggeredBy: triggeredBy)
    return
  }

  unblockSelection(removeSelection: selection, triggeredBy: triggeredBy)
}
