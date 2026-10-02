# Source Check

A full-stack forensic verification platform that combines hierarchical **Perceptual Hash (pHash) Quadtrees**, **RSA-2048 digital signatures**, and **BK-Tree discrete metric indexing**. The system provides fragile tamper localization (pinpointing tampered sectors down to fine quadrants) while remaining robust against compression noise and social media re-encodings.

---

## 1. System Architecture & Flowchart

```
========================================================================================
                             INGESTION & REGISTRATION PIPELINE
========================================================================================

 [ Uploaded Image ]
         │
         ▼
 [ Quadtree Decomposition ] ──► Recursively partitions spatial quadrants up to depth D=3
         │                     (Level 0: 1 node, Level 1: 4, Level 2: 16, Level 3: 64)
         ▼
 [ Perceptual Hashing ]    ──► Computes 64-bit DCT pHash for each of the 85 nodes
         │
         ▼
 [ Canonicalization ]      ──► Deterministically serializes Quadtree into canonical JSON
         │
         ▼
 [ SHA-256 Digest ]        ──► Computes SHA-256 hash of canonical Quadtree
         │
         ▼
 [ RSA Digital Signature ] ──► Signs SHA-256 digest using Author's Private Key (PKCS#1 v1.5)
         │
         ▼
 [ Central Ledger Storage] ──► Stores document in MongoDB + inserts Level-0 pHash into BK-Tree


========================================================================================
                         QUERY VERIFICATION & FORENSIC DRILL-DOWN
========================================================================================

 [ Query Image Upload ]
         │
         ▼
 [ Compute Query Root pHash ]
         │
         ▼
 [ BK-Tree Nearest Neighbor Search ] ──► Metric pruning via Triangle Inequality
         │
         ├────────────────────────────────────────┐
         │ Hamming Dist > 15                      │ Hamming Dist <= 15
         ▼                                        ▼
  [ REJECT CANDIDATE ]                  [ Candidate Master Record Found ]
  "Image not in registry"                         │
                                                  ▼
                                        [ RSA Signature Verification ]
                                        Validates Author Public Key & Tree Hash
                                                  │
                                                  ▼
                                 [ Top-Down Quadtree Drill-Down (O(log N)) ]
                                                  │
                    ┌─────────────────────────────┴─────────────────────────────┐
                    │                                                           │
                    ▼                                                           ▼
       [ Hamming Distance <= 3 ]                                   [ Hamming Distance > 3 ]
         Authentic Quadrant:                                         Branch Tampered:
       Prune subtree immediately                                   Recurse into sub-quadrants
                                                                                │
                                                                                ▼
                                                                   [ Pinpoint Leaf Tamper Box ]
                                                                   Generate Visual Heatmap & Area %
```

---

## 2. Key Features

* **Fragile Tamper Localization:** While the root pHash identifies the matching original image, sub-quadrant pHashes isolate the exact location and bounding box of localized edits (e.g. text insertion, object removal, deepfake face swapping).
* **Robust Against Compression:** Global rejection thresholds allow authentic compression variants ($\text{Dist} \le 4$) to be accepted, while flagging moderate alterations ($5 \le \text{Dist} \le 12$) and rejecting foreign images ($\text{Dist} > 15$).
* **Client-Side Private Key Ownership:** RSA-2048 keypairs are generated client-destined; the server never persists private keys, preventing cryptographic spoofing.
* **Efficient $O(\log N)$ Quadtree Pruning:** During verification, sub-quadrants with Hamming distance $\le 3$ are pruned immediately, skipping unnecessary comparisons.
* **BK-Tree Metric Indexing:** Rapid candidate retrieval across thousands of registered images in sub-millisecond time.
* **Custom Earth-Tone Theme:** Clean, modern interface styled with `dust_grey`, `dry_sage`, `fern`, `hunter_green`, and `pine_teal`.
* **Direct CORS Communication:** No reverse proxy or Nginx needed. Direct client-to-API communication enabled by FastAPI `CORSMiddleware`.

---

## 3. Technology Stack

* **Frontend:** React 18 (Vite), Tailwind CSS (custom earth-tone palette), Lucide Icons.
* **Backend:** FastAPI (Python 3.11+), Pydantic v2 schemas with strict typing, Motor (AsyncIO MongoDB driver).
* **Cryptography:** Python `cryptography` library (RSA-2048, PKCS#1 v1.5, SHA-256).
* **Forensics & Vision:** Pillow, ImageHash, OpenCV spatial decomposition.
* **Database:** MongoDB 6.0 with indexes on `level_0_phash`, `owner_id`, and `created_at`.
* **DevOps:** Docker & Docker Compose development setup with live volume mounts.

---

## 4. Environment Variables Specification

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MONGODB_URL` | MongoDB connection URI | `mongodb://localhost:27017` |
| `DATABASE_NAME` | MongoDB database name | `multimedia_provenance` |
| `UPLOAD_DIR` | Image files storage directory | `./uploads` (or `/app/uploads`) |
| `DEFAULT_QUADTREE_DEPTH` | Quadtree recursion depth $D$ | `3` (85 nodes) |
| `REJECTION_THRESHOLD` | Max root Hamming distance for match | `15` |
| `NATURAL_VARIANT_MAX` | Max distance for natural variant | `4` |
| `MODERATE_EDIT_MAX` | Max distance for moderate edit | `12` |
| `DRILLDOWN_BRANCH_THRESHOLD`| Distance threshold to expand branch | `3` |
| `VITE_API_URL` | Backend API URL for frontend | `http://localhost:8000/api/v1` |

---

## 5. Execution Instructions

### A. Run with Docker Compose

Starts MongoDB 6.0, FastAPI backend with Uvicorn `--reload` on port `8000`, and Vite Dev Server on port `5173`:

```bash
docker compose up --build
```

Access Points:
* **Frontend Application:** [http://localhost:5173](http://localhost:5173)
* **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **MongoDB:** `localhost:27017`

### B. Run Natively / Locally (Without Docker)

1. **Start MongoDB:**
   ```bash
   mongod --dbpath /data/db
   ```

2. **Backend:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Run Unit Tests:**
   ```bash
   PYTHONPATH=backend ./.venv/bin/python3 -m pytest backend/tests/ -v
   ```

---

## 6. API Documentation Reference

Interactive OpenAPI / Swagger documentation is available at:
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Core Endpoints

1. `POST /api/v1/auth/register`
   * Generates RSA-2048 keypair, stores public key, returns user record and private key with a security prompt.
2. `GET /api/v1/auth/users`
   * Lists registered author identities.
3. `POST /api/v1/registry/register-image`
   * Ingests master image, computes 85 Quadtree pHashes, validates author key, signs canonical tree digest, indexes in BK-Tree.
4. `GET /api/v1/registry/images`
   * Lists all registered provenance ledger records.
5. `GET /api/v1/registry/images/{image_id}/file`
   * Serves authentic baseline master image.
6. `POST /api/v1/verification/verify-image`
   * Searches root pHash in BK-Tree, validates RSA signature, performs top-down Quadtree drill-down, and returns tamper heatmap coordinates.
7. `GET /api/v1/verification/stats`
   * Returns BK-Tree index size and threshold metrics.
