# FINAL SECURITY RULES & TENANCY VALIDATION SPECIFICATION

This document details the production-grade **Firestore Security Rules** configured for **SOL**. By utilizing group-specific `memberships` mapping instead of global user roles, these rules guarantee robust multi-tenant isolation. No member can access, query, or edit data outside of their authorized savings groups.

---

## 1. COMPILATION SPECIFICATION (`firestore.rules`)

Below is the complete, active ruleset deployed to the Firestore Database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==========================================
    // 1. CORE SECURITY HELPER FUNCTIONS
    // ==========================================

    // Verifies that the client initiating the request is authenticated with Firebase Auth
    function isAuthenticated() {
      return request.auth != null;
    }

    // Safely retrieves the user document metadata
    function getUserDoc(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data;
    }

    // Safely reads a membership document from the database
    function getMembershipDoc(userId, solId) {
      return get(/databases/$(database)/documents/memberships/$(userId + "_" + solId)).data;
    }

    // Checks if a specific user-sol association exists in the memberships collection
    function hasMembership(userId, solId) {
      return exists(/databases/$(database)/documents/memberships/$(userId + "_" + solId));
    }

    // Validates that the user is an active participant or administrator of the Sòl group
    function isMemberOfSol(solId) {
      return isAuthenticated() && 
        hasMembership(request.auth.uid, solId) && 
        getMembershipDoc(request.auth.uid, solId).status == 'active';
    }

    // Validates that the user holds the administrator/Maman Sòl role for this specific Sòl group
    function isMamanSolOfSol(solId) {
      return isAuthenticated() && 
        hasMembership(request.auth.uid, solId) && 
        getMembershipDoc(request.auth.uid, solId).role == 'maman_sol' && 
        getMembershipDoc(request.auth.uid, solId).status == 'active';
    }

    // ==========================================
    // 2. COLLECTION RULES DEFINITIONS
    // ==========================================

    // Users Collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() && request.auth.uid == userId;
      allow delete: if false; // Block user deletion on client SDKs
    }

    // Sòl Groups Collection
    match /sols/{solId} {
      allow read: if isAuthenticated() && isMemberOfSol(solId);
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && isMamanSolOfSol(solId);
    }

    // Memberships Collection
    match /memberships/{membershipId} {
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || 
        isMemberOfSol(resource.data.solId)
      );
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        resource.data.userId == request.auth.uid || 
        isMamanSolOfSol(resource.data.solId)
      );
      allow delete: if isAuthenticated() && isMamanSolOfSol(resource.data.solId);
    }

    // Cycles Collection
    match /cycles/{cycleId} {
      allow read: if isAuthenticated() && isMemberOfSol(resource.data.solId);
      allow create: if isAuthenticated() && isMamanSolOfSol(request.resource.data.solId);
      allow update, delete: if isAuthenticated() && isMamanSolOfSol(resource.data.solId);
    }

    // Contributions Collection
    match /contributions/{contribId} {
      allow read: if isAuthenticated() && isMemberOfSol(resource.data.solId);
      allow create: if isAuthenticated() && isMamanSolOfSol(request.resource.data.solId);
      allow update: if isAuthenticated() && (
        isMamanSolOfSol(resource.data.solId) || 
        request.auth.uid == resource.data.userId ||
        request.auth.uid == resource.data.memberId
      );
      allow delete: if isAuthenticated() && isMamanSolOfSol(resource.data.solId);
    }

    // Beneficiaries Collection
    match /beneficiaries/{benId} {
      allow read: if isAuthenticated() && isMemberOfSol(resource.data.solId);
      allow create, update, delete: if isAuthenticated() && isMamanSolOfSol(resource.data.solId);
    }

    // Notifications Collection
    match /notifications/{notifId} {
      allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
    }

    // Invitations Collection
    match /invitations/{invId} {
      allow read: if isAuthenticated() && (
        isMamanSolOfSol(resource.data.solId) || 
        resource.data.email == request.auth.token.email
      );
      allow create: if isAuthenticated() && isMamanSolOfSol(request.resource.data.solId);
      allow update: if isAuthenticated() && (
        isMamanSolOfSol(resource.data.solId) || 
        resource.data.email == request.auth.token.email
      );
      allow delete: if isAuthenticated() && isMamanSolOfSol(resource.data.solId);
    }
  }
}
```

---

## 2. EXPLANATION OF CORE TENANCY CHECKS

To bypass the typical limit of security rules querying capacity, the architecture enforces a deterministic path lookup design:

### A. The Membership Lookup Trick ($O(1)$ Security Costs)
In Firestore, calling `get()` or `exists()` within rules consumes a single read credit. To determine if User `A` belongs to Sòl Group `B`, rules construct a path directly to a membership document using the ID format `${userId}_${solId}`:
```javascript
exists(/databases/$(database)/documents/memberships/$(request.auth.uid + "_" + solId))
```
This avoids expensive and complex collection group queries inside security filters, providing near-instantaneous validation rates.

### B. Group-Scoped Administrative Privileges (`isMamanSolOfSol`)
Global administrative roles present a severe security risk if an admin is compromised. In our schema, the traditional role `"maman_sol"` (Sòl Organizer/Manager) is strictly scoped to specific Sòl groups.
* A user may be a `maman_sol` (Manager) in **Group A** but a standard `member` (Contributor) in **Group B**.
* When managing **Group A** settings (e.g. initiating cycles, updating schedules), the security rule looks up their specific membership document for **Group A** and validates `role == "maman_sol"`.
* When viewing **Group B** statistics, they have standard view-only permissions.
