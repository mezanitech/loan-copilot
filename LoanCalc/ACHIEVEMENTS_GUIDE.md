# Achievement System Guide

## Overview
The Loan Copilot app now includes a comprehensive achievement system to encourage users to explore all features and celebrate their progress.

## Achievement Structure

### Tiers
Achievements are organized into 4 tiers, each with increasing difficulty:
- **Bronze** 🥉 - Beginner achievements for first-time actions
- **Silver** 🥈 - Intermediate achievements for continued use
- **Gold** 🥇 - Advanced achievements for power users
- **Platinum** 💎 - Elite achievements for completionists

### Categories
Achievements are grouped into 4 categories:

#### 1. Tutorial (4 achievements)
Basic features to get started:
- **First Loan** 🏠 (Bronze) - Create your first loan
- **First Extra Payment** 💰 (Bronze) - Add your first early payment
- **First Export** 📄 (Bronze) - Export your first PDF report
- **Schedule Viewer** 📊 (Bronze) - View payment schedule

#### 2. Exploration (5 achievements)
Advanced features:
- **Loan Duplicator** 📋 (Silver) - Duplicate a loan
- **Rate Adjuster** 📈 (Silver) - Add interest rate adjustment
- **Notification Master** 🔔 (Bronze) - Enable payment notifications
- **Currency Explorer** 💱 (Bronze) - Change currency settings
- **Recurring Pro** 🔁 (Silver) - Add recurring early payment

#### 3. Savings (5 achievements)
Financial milestones based on actual loan calculations:
- **Penny Saver** 💵 (Bronze) - Save $1,000 in interest
- **Interest Crusher** 💸 (Silver) - Save $5,000 in interest
- **Savings Master** 💎 (Gold) - Save $10,000 in interest
- **Half Year Hero** ⏰ (Silver) - Pay off 6 months early
- **Freedom Fighter** 🎯 (Gold) - Pay off 1 year early

#### 4. Power User (4 achievements)
Heavy usage milestones:
- **Loan Juggler** 🎪 (Silver) - Manage 5 loans
- **Extra Payment Expert** ⚡ (Silver) - Add 10 early payments
- **Scenario Planner** 🧪 (Gold) - Create 3 loan scenarios
- **Completionist** 🏆 (Platinum) - Unlock all other achievements

## How It Works

### Automatic Tracking
Achievements are tracked automatically as users interact with the app:
- Creating loans → `loans_created`
- Adding early payments → `early_payments_added`
- Exporting reports → `reports_exported`
- Viewing schedule → `schedule_views`
- Duplicating loans → `loans_duplicated`
- Adding rate adjustments → `rate_adjustments_added`
- Enabling notifications → `notifications_enabled`
- Changing currency → `currency_changed`
- Interest saved → `max_interest_saved`
- Time saved → `max_months_saved`

### Progress Storage
All progress is stored locally using AsyncStorage at the key `@achievement_progress`.

### Notifications
When an achievement is unlocked:
1. A push notification is sent (if notifications are enabled)
2. A celebratory modal appears in the app
3. The achievement badge is updated in the About tab

## User Interface

### Achievements Section in About Tab
- Located at the top of the About screen
- Shows overall completion percentage badge
- Expandable/collapsible section
- Category tabs for filtering
- Grid view of all achievements

### Achievement Card
Each achievement displays:
- Large icon (60px)
- Tier badge (color-coded)
- Title and description
- Progress bar (for locked achievements)
- Unlock date (for unlocked achievements)
- Lock icon (🔒) for locked achievements

### Visual Styling
- Locked achievements: 60% opacity
- Tier colors:
  - Bronze: #CD7F32
  - Silver: #C0C0C0
  - Gold: #FFD700
  - Platinum: #E5E4E2
- Glassmorphic design matching app theme

## Implementation Details

### Core Files
1. **achievementUtils.ts** - Achievement definitions, progress tracking, notifications
2. **AchievementComponents.tsx** - Display components (Card, Grid, Tabs)
3. **AchievementUnlockedModal.tsx** - Celebration modal with animation

### Integration Points
Achievement tracking is integrated into:
- `createLoan.tsx` - Track loan creation
- `payments.tsx` - Track early payments, rate adjustments, savings calculations
- `overview.tsx` - Track PDF export, loan duplication
- `schedule.tsx` - Track schedule views
- `notificationSettings.tsx` - Track notification enablement
- `currencySettings.tsx` - Track currency changes
- `_layout.tsx` - Initialize achievement system on app startup
- `about.tsx` - Display achievements section

### Functions

#### initializeAchievements()
Called on app startup to set up achievement structure in AsyncStorage.

#### incrementProgress(key, amount?)
Increments progress counter (e.g., loans created, reports exported).
```typescript
await incrementProgress('loans_created');
await incrementProgress('early_payments_added', 5);
```

#### updateProgress(key, value)
Updates progress to a specific value (e.g., max interest saved).
```typescript
await updateProgress('max_interest_saved', 2500.50);
```

#### getCompletionPercentage()
Returns the overall completion percentage (0-100).

#### sendAchievementNotification(achievement)
Sends a push notification when an achievement is unlocked.

## Future Enhancements

Potential additions:
- Share achievement unlocks to social media
- Achievement leaderboards (if adding backend)
- Special rewards for platinum achievements
- Seasonal/limited-time achievements
- Achievement hints for locked achievements
- Sound effects on unlock
- Confetti animation on unlock
- Export achievements as image

## Testing

To test achievements:
1. Create a new loan → Unlocks "First Loan"
2. Add an early payment → Unlocks "First Extra Payment"
3. View schedule tab → Unlocks "Schedule Viewer"
4. Export PDF report → Unlocks "First Export"
5. Enable notifications → Unlocks "Notification Master"
6. Change currency → Unlocks "Currency Explorer"
7. Duplicate a loan → Unlocks "Loan Duplicator"
8. Add rate adjustment → Unlocks "Rate Adjuster"
9. Create multiple loans and add early payments to trigger savings achievements

## Data Structure

```typescript
type AchievementProgress = {
  id: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
};
```

Stored in AsyncStorage as:
```json
{
  "first_loan": {
    "id": "first_loan",
    "unlocked": true,
    "unlockedAt": "2025-01-02T10:30:00.000Z",
    "progress": 1,
    "maxProgress": 1
  },
  "save_1k": {
    "id": "save_1k",
    "unlocked": false,
    "progress": 432.50,
    "maxProgress": 1000
  }
}
```

## Best Practices

1. **Never block user actions** - Achievements should be celebratory, not restrictive
2. **Progressive disclosure** - Show locked achievements to encourage exploration
3. **Meaningful milestones** - Base achievements on real financial impact
4. **Instant feedback** - Unlock achievements immediately when conditions are met
5. **Persistent storage** - Never lose user progress
6. **Performance** - Keep tracking lightweight and asynchronous

## Troubleshooting

### Achievement not unlocking
- Check that tracking function is called correctly
- Verify progress threshold in achievementUtils.ts
- Check AsyncStorage for current progress: `@achievement_progress`

### Modal not appearing
- Ensure AchievementUnlockedModal is imported in the screen
- Check that visible prop is set correctly
- Verify achievement state is updated

### Notification not sending
- Check notification permissions are granted
- Verify expo-notifications is configured correctly
- Check notification handler is set up in _layout.tsx

### Progress not saving
- Verify AsyncStorage write permissions
- Check for async/await errors in tracking functions
- Look for error logs in console
