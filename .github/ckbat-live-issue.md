DFINITY's ckERC-20 minter now lists BAT.

- Symbol: `${SYMBOL}`
- ckBAT ledger: `${LEDGER}`
- Detected: `${DETECTED_AT}` by `ckbat-watch`

Verify before acting on this — the job is a tripwire, not an authority:

```
npm install --prefix scripts/ckbat-watch
node scripts/ckbat-watch/check.mjs
```

## Then, in order

1. **Send the promised email.** One message, at launch, to the waitlist. No
   newsletter — that was the stated promise on `/brave`, and it is the entire
   reason anyone joined the list.
2. **Publish the BAT reserve-band rule on `/proof` FIRST.** The treasury
   policy commits to that rule appearing *before the first BAT deposit is
   accepted*, not after. Opening intake before it is published breaks a
   commitment that is already public.
3. Wire the BAT intake path and smoke-test it with real funds, both
   directions (deposit and withdraw).
4. Add a `CHANGELOG.md` entry.

`/brave` flips itself to the live state on its own — it reads the minter on
every load — so there is no need to redeploy the frontend just to change that
copy.
