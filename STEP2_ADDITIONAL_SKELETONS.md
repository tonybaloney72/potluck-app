# Additional Skeletons: ProfilePage, NotificationDropdown, ProtectedRoute

This guide shows exactly how to replace LoadingSpinner with skeletons in these three components.

---

## ✅ Step 1: Skeleton Components Added

The following skeleton components have been **already added** to `src/components/common/Skeleton.tsx`:

- ✅ `SkeletonProfilePage` - Matches profile form layout
- ✅ `SkeletonNotificationItem` - Matches notification item layout
- ✅ `SkeletonAppLoader` - Full-screen app initialization skeleton

---

## Step 2: Update ProfilePage

**File**: `src/pages/ProfilePage.tsx`

**Change**: Replace `LoadingSpinner` import and usage with `SkeletonProfilePage`.

```typescript
// REMOVE this import:
import { LoadingSpinner } from "../components/common/LoadingSpinner";

// ADD this import:
import { SkeletonProfilePage } from "../components/common/Skeleton";

// REPLACE this code (around line 94-95):
if (!profile) return <LoadingSpinner fullScreen message='Loading profile...' />;

// WITH:
if (!profile) {
	return <SkeletonProfilePage />;
}
```

---

## Step 3: Update NotificationDropdown

**File**: `src/components/notifications/NotificationDropdown.tsx`

**Change**: Replace `LoadingSpinner` import and usage with `SkeletonNotificationItem`.

```typescript
// REMOVE this import:
import { LoadingSpinner } from "../common/LoadingSpinner";

// ADD this import:
import { SkeletonNotificationItem } from "../common/Skeleton";

// REPLACE this code (around line 171-174):
{loading && notifications.length === 0 ? (
	<div className='p-8'>
		<LoadingSpinner />
	</div>
) : notifications.length === 0 ? (

// WITH:
{loading && notifications.length === 0 ? (
	<div className='divide-y divide-border'>
		{Array.from({ length: 3 }).map((_, i) => (
			<SkeletonNotificationItem key={i} />
		))}
	</div>
) : notifications.length === 0 ? (
```

---

## Step 4: Update ProtectedRoute

**File**: `src/components/common/ProtectedRoute.tsx`

**Change**: Replace `LoadingSpinner` import and usage with `SkeletonAppLoader`.

```typescript
// REMOVE this import:
import { LoadingSpinner } from "./LoadingSpinner";

// ADD this import:
import { SkeletonAppLoader } from "./Skeleton";

// REPLACE this code (around line 14-16):
if (initializing && !user) {
	return <LoadingSpinner fullScreen message='Loading...' />;
}

// WITH:
if (initializing && !user) {
	return <SkeletonAppLoader />;
}
```

---

## Step 5: Delete LoadingSpinner (Optional)

After verifying all replacements work correctly:

1. **Verify no other files use LoadingSpinner**:

   ```bash
   grep -r "LoadingSpinner" src/
   ```

   Should only show:

   - `src/components/common/LoadingSpinner.tsx` (the file itself)
   - Maybe some guide/documentation files (which is fine)

2. **Delete the file**:
   - Delete `src/components/common/LoadingSpinner.tsx`

---

## Quick Checklist

- [ ] ProfilePage uses `SkeletonProfilePage`
- [ ] NotificationDropdown uses `SkeletonNotificationItem`
- [ ] ProtectedRoute uses `SkeletonAppLoader`
- [ ] All LoadingSpinner imports removed
- [ ] LoadingSpinner.tsx deleted (optional)

---

## Testing

After making changes:

1. **ProfilePage**: Navigate to `/profile` - should see skeleton form while profile loads
2. **NotificationDropdown**: Click bell icon - should see skeleton notifications while loading
3. **ProtectedRoute**: Refresh page - should see skeleton app loader during initialization
4. **No spinners**: Verify no spinning loaders appear anywhere

---

## Notes

- Skeleton components already exist in `Skeleton.tsx` - no need to add them again
- All skeletons use the pulse animation by default
- Skeletons match the actual content layout to prevent layout shift
- All skeletons are accessible with `aria-label="Loading..."`

Good luck! 🦴✨
