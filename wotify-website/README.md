# WOTIFY WEBSITE — chalane aur online lagane ka tareeqa

## Is mein kya hai
- **Owner ka alag interface** (username: `owner`) — Clients, Orders,
  Logins & Ledger, Settings. Sab kuch wahi se set hota hai.
- **Clients:** owner client banata hai to username khud banta hai —
  `client01`, `client02`, `client03` ... aur password bhi owner set
  karta hai. Client apne username/password se login karta hai.
- **Owner kisi bhi client ko:** block/unblock kar sakta hai, uska
  password change kar sakta hai, credits set kar sakta hai.
- **Credits:** 1,000 per minute (10-minute video = 10,000). Owner hi
  credits deta hai; balance kam ho to order nahi banta.
- **Video order:** topic / apna script / apni voiceover, voice chunein,
  hoodie color + mood + style — har option ke saath hero ki preview
  image. Order ki stage client ko dikhti hai; video tayyar ho to
  owner delivery link lagata hai, wo client ko plain text mein milta hai.
- **Studio Chat (AI):** Radox AI API se chalta hai (server par key
  lagi hoti hai; client ko key kabhi nahi dikhti).
- **Login activity log:** kis ne kab login kiya, ghalat password,
  block — sab owner ko dikhta hai.

## Apne computer/server par chalana
Sirf **Node.js** chahiye (koi npm install nahi).

```
RADOX_API_KEY=apki_radox_key node server.js
```

Phir browser: http://localhost:8080
Owner pehla login: username `owner`, password `roshan780@`
(pehla password `OWNER_PASSWORD` env se bhi badal sakte hain; baad
mein owner Settings tab se apna password kabhi bhi badal sakta hai.)

Data `data.json` file mein save hota hai (isi folder mein banti hai).

## Online lagana (apna poora URL)
Kisi bhi Node hosting par ye folder upload karein aur start command
`node server.js` dein, aur environment variable `RADOX_API_KEY`
wahan set karein:
- **Render.com** (free tier hai) — New Web Service → repo/folder →
  start command `node server.js`.
- **Railway / VPS** — isi tarah.
Deploy ke baad aap ko apna URL milega (jaise
`https://wotify-xxxx.onrender.com`) — website par kisi AI company
ka naam nahi ayega.

## Zaroori note — Radox key
Key verify hai aur models ki list theek ati hai, lekin file likhne
tak Radox chat par ye error a raha tha: *"Billing verification
failed. Please check your payment method."* — ye Radox ki taraf se
hai: unke dashboard mein payment method / balance theek karte hi
Studio Chat khud bakhud chal parega. Website ke baaki saare hisse
(login, clients, credits, orders) key ke baghair bhi chalte hain.

Video banana (2D Studio render) is website ke andar nahi hota —
orders yahan ate hain, video peeche se Muse ke 2D Studio se banti
hai aur owner us ka link Orders tab mein laga deta hai; client ko
wohi link us ke "My Videos" mein mil jata hai.
