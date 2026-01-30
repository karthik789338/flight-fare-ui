# ✈️ Flight Fare Prediction UI (React + Vite)

Build and run a front-end to select **From / To cities** and a **future travel date**, then call a backend API to return a **predicted flight fare (USD)**.

---

## ✅ Features

* Use city **autocomplete** (keyboard + mouse)
* **Swap** From/To cities
* Pick **future-only** travel dates (tomorrow onwards)
* Use **quick suggestions** to auto-fill common routes
* See clear errors for invalid input, missing env, and API failures

---

## 🧰 Tech Stack

* React + Vite
* Custom CSS
* Backend: any HTTP API (AWS Lambda Function URL / Cloud Run / FastAPI, etc.)

---

## ⚙️ Setup

### 1) Install dependencies

```
npm install
```

### 2) Add environment variable

Create a `.env` file in the project root:

```
VITE_API_URL=https://YOUR_API_ENDPOINT/
```

Only variables prefixed with `VITE_` are exposed by Vite.

### 3) Run locally

```
npm run dev
```

### 4) Build and preview

```
npm run build
npm run preview
```

---

## 📡 API Contract

Use a backend that supports these endpoints:

### `GET /` — metadata (cities/quarters)

Return metadata for autocomplete.

Response:

```
{
  "cities": ["Dallas/Fort Worth, TX", "Chicago, IL"],
  "quarters": [1, 2, 3, 4]
}
```

### `POST /` — prediction

Send:

```
{
  "city1": "Dallas/Fort Worth, TX",
  "city2": "New York City, NY (Metropolitan Area)",
  "quarter": 1
}
```

Receive:

```
{
  "prediction": 412
}
```

Rules:

* Return `prediction` as a number (USD)
* Derive `quarter` from the selected date:

  * Jan–Mar → Q1
  * Apr–Jun → Q2
  * Jul–Sep → Q3
  * Oct–Dec → Q4

---

## 🌍 Deploy

### GitHub Pages

Set the Vite base path to match the repo name.

In `vite.config.js`:

```
export default defineConfig({
  base: "/<repo-name>/",
});
```

Deploy steps:

1. Open GitHub → Settings → Pages
2. Set Source to GitHub Actions
3. Open Settings → Secrets and variables → Actions → Variables
4. Add `VITE_API_URL` = your backend URL
5. Push to `main` to trigger deploy

### Netlify / Vercel

If deploying at a root domain, set:

```
base: "/"
```

Then add `VITE_API_URL` in hosting environment variables.

---

## 📁 Project Structure

```
src/
  App.jsx        # UI logic + API calls
  App.css        # component styles
  main.jsx       # React entry
  index.css      # global styles
.github/workflows/
  deploy.yml     # GitHub Pages deploy workflow
vite.config.js
```

---

## 🛠 Troubleshooting

* Fix a blank GitHub Pages screen by setting the correct `base` in `vite.config.js`
* Fix CORS errors by allowing requests from the deployed UI origin in the backend
* Fix missing env issues by adding `.env` locally or setting `VITE_API_URL` in deployment variables
