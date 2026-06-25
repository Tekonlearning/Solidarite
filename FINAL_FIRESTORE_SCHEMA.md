# FINAL FIRESTORE SCHEMA & PRODUCTION BLUEPRINT

This document provides the complete, production-ready Firestore Database Schema for **SOL**, a community savings platform. In accordance with architectural refinements, group-scoped roles have been decentralized into the `memberships` collection, and the global `role` field has been removed from the `users` collection. This enforces strict multi-tenancy, permitting users to have different roles (e.g., `maman_sol` vs. `member`) across multiple independent Sòl groups.

---

## 1. DATA ARCHITECTURE OVERVIEW

Firestore is a document-oriented NoSQL database. To support high-performance queries and robust security boundaries, our data model uses a flat root-collection structure with relational referencing.

### Key Refactoring Details:
1. **Decentralized Roles:** Global `role` was removed from `/users/{userId}`.
2. **Memberships Collection:** Replaced `/members` with `/memberships`.
3. **Deterministic Document IDs:** Membership documents use the deterministic format `${userId}_${solId}`. This allows $O(1)$ lookup complexity within Security Rules (`exists` and `get` operations), which is a crucial requirement for validating group membership without complex queries.

---

## 2. FIRESTORE COLLECTION SCHEMAS

### Collection: `users`
* **Description:** Global user account profile metadata, initialized during registration.
* **Path:** `/users/{userId}` (where `{userId}` corresponds to the Firebase Auth `uid`).

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `uid` | String | Yes | Unique Firebase Authentication UID. |
| `email` | String | Yes | Email address (unique, lowercase). |
| `displayName`| String | Yes | User's full name. |
| `photoURL` | String | No | URL to profile picture. |
| `language` | String | Yes | Language preferences: `"creole" \| "french" \| "english"`. |
| `createdAt` | Timestamp| Yes | Timestamp when the user account was created. |
| `updatedAt` | Timestamp| Yes | Timestamp when the user profile was last updated. |

---

### Collection: `sols`
* **Description:** Representation of traditional community Sòl savings groups.
* **Path:** `/sols/{solId}`

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Unique ID of the Sòl group. |
| `name` | String | Yes | Display name of the Sòl group. |
| `description`| String | Yes | Detailed description or community purpose. |
| `contributionAmount`| Number | Yes | Amount each member contributes per step (in HTG or USD). |
| `frequency` | String | Yes | Contribution frequency: `"weekly" \| "biweekly" \| "monthly"`. |
| `totalPot` | Number | Yes | Calculated pool size: `contributionAmount * maxMembers`. |
| `status` | String | Yes | Group lifecycle status: `"upcoming" \| "active" \| "completed"`. |
| `creatorId` | String | Yes | User ID of the user who initialized the Sòl group. |
| `currentCycleId`| String | Yes | Document reference ID of the current active `cycle`. |
| `cycleNumber` | Number | Yes | The current cycle rotation number (starts at 1). |
| `maxMembers` | Number | Yes | Hard ceiling for membership capacity (e.g. 8, 12, 16). |
| `rules` | String | No | Custom terms, late fee rules, or descriptions of penalties. |
| `tirayMethod` | String | Yes | Drawing/order system: `"random" \| "first_come" \| "manual"`. |
| `createdAt` | Timestamp| Yes | Timestamp of Sòl group creation. |
| `updatedAt` | Timestamp| Yes | Timestamp of last Sòl settings update. |

---

### Collection: `memberships`
* **Description:** Represents a user's subscription and role inside a specific Sòl group.
* **Path:** `/memberships/{membershipId}` (Deterministic ID format: `${userId}_${solId}`).

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Composite primary key: `${userId}_${solId}`. |
| `solId` | String | Yes | Reference to the `sols` document. |
| `userId` | String | Yes | Reference to the `users` document. |
| `name` | String | Yes | Display name of member (cached for high-performance reading). |
| `email` | String | Yes | Email address of member (cached). |
| `phone` | String | Yes | Phone number (cached). |
| `role` | String | Yes | Group role: `"maman_sol" \| "member"`. |
| `status` | String | Yes | Status of membership: `"active" \| "pending" \| "suspended" \| "removed"`. |
| `joinedAt` | Timestamp| Yes | Timestamp when the user joined the group. |
| `avatarUrl` | String | No | Cached profile image URL. |

---

### Collection: `cycles`
* **Description:** Active rotational stages (rounds) inside a Sòl group.
* **Path:** `/cycles/{cycleId}`

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Unique ID of the cycle period. |
| `solId` | String | Yes | Reference to the parent Sòl group. |
| `cycleNumber` | Number | Yes | The absolute round index of this cycle. |
| `startDate` | Timestamp| Yes | Start timestamp of the current cycle. |
| `endDate` | Timestamp| Yes | Scheduled completion timestamp. |
| `status` | String | Yes | Lifecycle status: `"upcoming" \| "active" \| "completed"`. |
| `currentHandPosition`| Number | Yes | The current drawing order index receiving the payout pot. |
| `totalHands` | Number | Yes | Total participants in this cycle round. |
| `totalCollected`| Number | No | Dynamic sum tracking active collection totals. |

---

### Collection: `contributions`
* **Description:** Individual periodic saving inputs due from members during a cycle.
* **Path:** `/contributions/{contribId}`

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Unique contribution record ID. |
| `solId` | String | Yes | Reference to Sòl group. |
| `cycleId` | String | Yes | Reference to the current cycle. |
| `memberId` | String | Yes | User ID (`userId`) who owes this contribution. |
| `amount` | Number | Yes | Monetary value of the payment (matches Sòl settings). |
| `dueDate` | Timestamp| Yes | Deadline for contribution. |
| `paidDate` | Timestamp| No | Exact time when contribution was processed. |
| `status` | String | Yes | Payment status: `"pending" \| "paid" \| "late"`. |
| `paymentMethod`| String | No | Method of payment (e.g., `"Cash"`, `"MonCash"`, `"Bank Transfer"`). |

---

### Collection: `beneficiaries`
* **Description:** Scheduled draw matrix matching members to payout steps.
* **Path:** `/beneficiaries/{benId}`

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Unique beneficiary allocation record ID. |
| `solId` | String | Yes | Reference to Sòl group. |
| `cycleId` | String | Yes | Reference to the cycle. |
| `memberId` | String | Yes | User ID (`userId`) scheduled for payout. |
| `memberName` | String | Yes | Cached display name for fast dashboard rendering. |
| `position` | Number | Yes | Payout step position (e.g. `1` for first hand, `2` for second...). |
| `payoutDate` | Timestamp| Yes | Planned payout date for this hand position. |
| `status` | String | Yes | Status of payout: `"upcoming" \| "current" \| "completed"`. |
| `payoutAmount`| Number | Yes | Lump-sum payout value: `potAmount` minus fees (if any). |

---

### Collection: `notifications`
* **Description:** Transaction alerts, invitation links, or payment reminders.
* **Path:** `/notifications/{notifId}`

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Unique notification ID. |
| `userId` | String | Yes | Recipient user ID. |
| `title` | String | Yes | Alert title (multilingual/localized). |
| `message` | String | Yes | Detailed body text. |
| `category` | String | Yes | Enum: `"contribution_due" \| "contribution_late" \| "beneficiary_selected" \| "member_joined" \| "cycle_started" \| "cycle_completed" \| "invitation_received"`. |
| `date` | Timestamp| Yes | Generation timestamp. |
| `read` | Boolean | Yes | Status indicator (`true`/`false`). |
| `solId` | String | No | Associated Sòl group reference. |

---

### Collection: `invitations`
* **Description:** Group invites sent to prospects.
* **Path:** `/invitations/{invId}`

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Invitation token/ID. |
| `solId` | String | Yes | Sòl group they are invited to join. |
| `solName` | String | Yes | Display name of the Sòl group. |
| `email` | String | Yes | Target invitee's email. |
| `name` | String | Yes | Display name of invitee. |
| `status` | String | Yes | Invitation status: `"sent" \| "accepted" \| "expired"`. |
| `dateSent` | Timestamp| Yes | Dispatch timestamp. |

---

### Collection: `reports`
* **Description:** Aggregated historical metrics for analytics.
* **Path:** `/reports/{reportId}`

| Field Name | Type | Required | Description / Constraints |
| :--- | :--- | :---: | :--- |
| `id` | String | Yes | Unique report record ID. |
| `solId` | String | Yes | Referenced Sòl group. |
| `cycleId` | String | Yes | Referenced cycle. |
| `totalCollected`| Number | Yes | Total funds collected in HTG. |
| `totalPaidOut` | Number | Yes | Total amount distributed to beneficiaries. |
| `payoutRate` | Number | Yes | Percentage of successful payouts. |
| `punctualityRate`| Number | Yes | Percentage of contributions paid on or before due date. |
| `generatedAt` | Timestamp| Yes | Report generation timestamp. |

---

## 3. RECOMMENDED FIRESTORE INDEXES

Firestore automatically indexes single fields, but composite indexes are required for complex filtering and sorting logic inside the dashboard.

### Composite Indexes:

1. **Collection:** `memberships`
   * Fields: `userId` (Ascending), `status` (Ascending)
   * *Use Case:* Fetching active Sòl groups for a specific user to populate the multi-tenant sidebar.

2. **Collection:** `memberships`
   * Fields: `solId` (Ascending), `joinedAt` (Descending)
   * *Use Case:* Listing all group members ordered by their join date.

3. **Collection:** `cycles`
   * Fields: `solId` (Ascending), `cycleNumber` (Descending)
   * *Use Case:* Fetching the history of cycle rounds inside a group.

4. **Collection:** `contributions`
   * Fields: `solId` (Ascending), `memberId` (Ascending), `status` (Ascending)
   * *Use Case:* Getting pending or late payments for a specific member in a specific group.

5. **Collection:** `contributions`
   * Fields: `solId` (Ascending), `dueDate` (Ascending)
   * *Use Case:* Generating the payment schedule list inside the reports page.

6. **Collection:** `beneficiaries`
   * Fields: `solId` (Ascending), `position` (Ascending)
   * *Use Case:* Rendering the chronological payout order matrix (Tiray/Drawing queue).

7. **Collection:** `notifications`
   * Fields: `userId` (Ascending), `date` (Descending)
   * *Use Case:* Querying read/unread user inbox feed in chronological order.
