## Missing
* admin token currently is passed in plaintext in the Authentication Header

## Completed
* user authentication and login via JWT

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