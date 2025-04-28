## Missing
* admin token currently is passed in plaintext in the Authentication Header

## Completed
* user authentication and login via JWT
* payments via ETH smart contract - listener to payments with appointment id
* deleting appointments if no payment for 10 minutes after creation (TODO: how to make this more robust - we use a timeout - if the server is stopped the timeout is stopped too)

## Flow
1. Admin creates available calendar slots for appointments
2. customer picks a calendar slot and requests an appointment (RESERVED status)
3. admin either accepts the appointment request (CONFIRMED status) or deletes the appointment request (TODO: how to notifiy the customer on confirmation or deletion? https://www.w3schools.com/nodejs/nodejs_email.asp)
4. customer can delete appointment & free up the calendar slot

## Paying for appointments
* P0: manual tracking (pay at appointment)
* P1: integrating payments provider (Stripe? Paypal?)
* P2: Blockchain integration:
 * when requesting an appointment - status PENDING_PAYMENT
 * send money to wallet or contract if not received within 10 minutes -> delete appointment
 * backend listens to payment arrival event (need to store sender wallet address of customer or request for appointment id as reference - for contract receiving the payments)
 * backend sets status to RESERVED & if cancelled - trigger repayment to customer
 * contracts needed:
  * Escrow Contract: receives payments, sends payment events, keeps money as long as appointment has not taken place, trigger repayment on cancellation
  * Oracle: add appointment detail into Escrow Contract: allow Escrow to check: has the appointment taken place yet? If yes: money can be withdraw, if no: lock up - to remove trust required

## Design Decisions
### Keeping track of unpaid appointments (to be cancelled after 10 min)
* Javascript interval - run an async function that triggers after 10 minutes, checks whether the appointment has been paid or not and cancells it if not paid - issue: restarting the server cancels the interval
* external Cron job for checking pending appointments: no risk of losing events, but requires a separate system (= higher complexity)

### Notifications
* e-mails
* real-time events to user via Websockets or similar