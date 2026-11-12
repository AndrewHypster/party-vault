# Party Vault

Party Vault helps friends keep a shared record of company contributions,
expenses, balances, and monthly activity.

## Requirements

- Node.js 20+
- A Neon PostgreSQL database
- Google OAuth credentials

## Local setup

1. Install dependencies with `npm install`.
2. Create `.env.local` in the project root:

   ```env
   DATABASE_URL=postgresql://...
   AUTH_SECRET=your-generated-secret
   AUTH_GOOGLE_ID=your-google-oauth-client-id
   AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
   ```

   Generate an auth secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. In Google Cloud Console, add
   `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
4. Apply the Drizzle schema to Neon:

   ```bash
   npm run db:push
   ```

5. Start the development server with `npm run dev`.

The database schema is defined in `db/schema.ts`. The app uses JWT-backed
Auth.js sessions and stores Google users, company memberships, privacy settings,
and transactions in Neon.

## Company privacy

Owners can make a company searchable, choose whether its balance appears in
search results, and control who can identify contributors. Company members can
see the shared transaction history and company-level totals. Only owners can
record expenses, review join requests, or change company settings.

Members can view the active member list and join dates. Owners can remove
members. Deleting a company requires the owner's affirmative vote and votes in
favor from more than half of the other active members captured when voting
starts. Voting expires after seven days; if the threshold is not reached, the
company remains.
