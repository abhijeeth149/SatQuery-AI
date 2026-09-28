# SatQuery AI — Interactive Multimodal Vision-Language Assistant for Remote Sensing

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://www.sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/SIH26167-Space%20%26%20Technology-cyan.svg)](https://www.sih.gov.in/)
[![Category](https://img.shields.io/badge/Category-Software-orange.svg)]()
[![Team](https://img.shields.io/badge/Team-SHOURYANGULU-purple.svg)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

> **"Ask Your Satellite Imagery Anything."**  
> *An interactive vision-language assistant for multimodal remote sensing image analysis through natural-language queries, physics-grounded spectral/SAR analysis, agentic tool orchestration, and auditable spatial evidence.*

---

## 📑 Table of Contents

1. [Executive Summary & Problem Statement](#-1-executive-summary--problem-statement)
2. [Why SatQuery AI Is Different](#-2-why-satquery-ai-is-different)
3. [End-to-End System Architecture](#-3-end-to-end-system-architecture)
4. [Agentic Controller & 11-Step Lifecycle](#-4-agentic-controller--11-step-lifecycle)
5. [Specialist Remote Sensing Capabilities](#-5-specialist-remote-sensing-capabilities)
   - [Single-Image Optical Intelligence (VQA, Captioning, Grounding)](#51-single-image-optical-intelligence)
   - [SAR Radar Backscatter & Speckle Filtering](#52-sar-radar-backscatter--speckle-filtering)
   - [Bi-Temporal Change Vector Analysis (CVA)](#53-bi-temporal-change-vector-analysis-cva)
   - [Optical + SAR Cross-Modal Fusion](#54-optical--sar-cross-modal-fusion)
6. [Spatial Evidence & Multi-Factor Confidence Engine](#-6-spatial-evidence--multi-factor-confidence-engine)
7. [Observable Execution Trace](#-7-observable-execution-trace)
8. [Machine Learning & Remote Sensing Adaptation](#-8-machine-learning--remote-sensing-adaptation)
9. [Dataset Landscape & Benchmarking](#-9-dataset-landscape--benchmarking)
10. [Technology Stack](#-10-technology-stack)
11. [Feasibility & Viability Matrix](#-11-feasibility--viability-matrix)
12. [Real-World Impact Domains](#-12-real-world-impact-domains)
13. [Phased Development Roadmap](#-13-phased-development-roadmap)
14. [Installation & Local Deployment](#-14-installation--local-deployment)
15. [Demo Scenarios & Test Suite](#-15-demo-scenarios--test-suite)
16. [Project Repository Structure](#-16-project-repository-structure)
17. [Requirement Traceability & References](#-17-requirement-traceability--references)

---

## 🛰️ 1. Executive Summary & Problem Statement

### The Problem
Remote sensing satellite imagery (Sentinel-1 SAR, Sentinel-2 Optical/Multispectral, Landsat, PlanetScope) is dense, information-rich, and foundational for global decision-making. However:
1. **Expertise Bottleneck**: Extracting actionable answers requires deep expertise in Geographic Information Systems (GIS), band math, radiometric calibration, and spatial statistics.
2. **Multimodal Friction**: Sentinel-1 SAR and Sentinel-2 optical provide highly complementary data (structural dielectric roughness vs. chemical reflection), but combining them requires separate preprocessing pipelines and manual cross-modal alignment.
3. **Temporal Complexity**: Bi-temporal and multi-temporal change detection requires precise radiometric normalization, phase-correlation co-registration, and manual threshold tuning.
4. **Tool Fragmentation**: Users must manually chain multiple disconnected tools (QGIS, SNAP, GDAL, Python scripts) to interpret a single scene.
5. **VLM Hallucination**: Generic Vision-Language Models (e.g. standard GPT-4V/LLaVA) hallucinate pixel coordinates, cannot parse 12-bit/16-bit GeoTIFF multi-band rasters, invent spatial statistics, and lack physics-grounded Earth Observation understanding.

```
TRADITIONAL GIS WORKFLOW (FRAGMENTS & MANUAL BOTTLENECKS):
Satellite Data → GIS Software → Band Math / Preprocessing → Specialist Analysis → Manual Interpretation → Decision

SATQUERY AI AGENTIC WORKFLOW (UNIFIED & EVIDENCE-GROUNDED):
Natural Language Query → Input Validator → Agentic Controller → Specialist Tools → Evidence Fusion → Observable Answer
```

### Problem Statement Details (SIH 2026)
- **Problem Statement ID**: `SIH26167`
- **Title**: *SatQuery AI – An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Text Queries*
- **Theme**: Space and Technology
- **Category**: Software
- **Team**: SHOURYANGULU

---

## ⚡ 2. Why SatQuery AI Is Different

| Feature | Generic VLM / Chatbot | Traditional GIS Software | SatQuery AI |
|:---|:---|:---|:---|
| **Query Modality** | Natural Language | Complex UI / Python API | Natural Language + Interactive GUI |
| **Sensor Handling** | 8-bit RGB only | GeoTIFF, SAR, Multispectral | Native GeoTIFF, SAR, Multispectral, RGB |
| **Reasoning Basis** | Generative Token Prediction | Manual Operator Math | Deterministic Physics Indices + Specialist ML |
| **Spatial Grounding** | Unreliable / Hallucinated | Manual Polygon Drawing | Automated Vector Contours, Bounding Boxes & Compass Sectors |
| **Hallucination Risk** | High (invents land-cover %) | Zero (pure tool output) | Zero (answers derived directly from raster evidence) |
| **Confidence Scoring** | Uncalibrated logit score | N/A | Multi-factor (separability, data quality, bimodality) |
| **Auditability** | Black Box | Manual Log | Full Observable Execution Trace JSON |

---

## 🏛️ 3. End-to-End System Architecture

SatQuery AI couples a modern React 18 / TypeScript frontend with a high-throughput FastAPI backend, orchestrating an agentic controller that delegates to deterministic remote-sensing services and fine-tuned machine learning models.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 PRESENTATION LAYER                              │
│   React 18 + TypeScript + Vite + Tailwind CSS + Leaflet GIS + Dual Theme Engine │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ REST API / Multipart GeoTIFF Upload
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 API GATEWAY                                     │
│          FastAPI (Python 3.12+) · Pydantic V2 Validation · SQLite Database       │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         INPUT & METADATA VALIDATOR                              │
│   TIFF/GeoTIFF Validation · Modality Detection · CRS Parsing · Dimension Match  │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             AGENTIC CONTROLLER                                  │
│         Intent Classification · Model Registry Dispatch · Tool Routing          │
└────────────┬───────────────────────────┼───────────────────────────┬────────────┘
             │                           │                           │
             ▼                           ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ SINGLE IMAGE SPECIALIST │ │  BI-TEMPORAL SPECIALIST │ │  OPTICAL + SAR FUSION   │
│ • Spectral Indices      │ │ • Change Vector (CVA)   │ │ • Backscatter Filtering │
│ • Otsu Land-Cover Tree  │ │ • Spectral Difference   │ │ • Structural Roughness  │
│ • Vector Grounding      │ │ • Change VQA Engine     │ │ • Decision Arbitration  │
│ • Visual Scene Classifier│ │ • Area Calculator       │ │ • Dual Mask Synthesis   │
└────────────┬────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
             │                           │                           │
             └───────────────────────────┼───────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SPATIAL EVIDENCE INTEGRATOR                             │
│   Contour Vectorizer · Compass Sector Mapper · Area & Metric Aggregator         │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MULTI-FACTOR CONFIDENCE ENGINE                          │
│   Otsu Separability · Bimodality Coefficient · Sensor Calibration · Agreement   │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      EXECUTION TRACE & REPORT GENERATOR                         │
│       Observable Step Timings · Structured JSON Audit · Print-Ready PDF/HTML     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 4. Agentic Controller & 11-Step Lifecycle

The agent does not act as a monolithic black-box LLM; it is an **observable controller and deterministic workflow engine**:

```
[01. User Query & Image Upload]
              ↓
[02. Format & Metadata Validation]  → Checks GeoTIFF integrity, CRS, raster bounds, nodata mask
              ↓
[03. Sensor Modality Detection]     → Identifies single optical, single SAR, bi-temporal, or optical+SAR pair
              ↓
[04. Agent Intent Classification]   → Maps text query to task (VQA, CAPTION, GROUNDING, CHANGE_VQA, FUSION)
              ↓
[05. Tool & Model Selection]        → Queries Model Registry for PREFERRED or FALLBACK tool
              ↓
[06. Spatial & Radiometric Align]   → Phase-correlation alignment + CRS re-projection if needed
              ↓
[07. Specialist Tool Execution]     → Computes spectral indices, Lee filter, CVA, or neural inference
              ↓
[08. Spatial Evidence Extraction]   → Extracts pixel masks, vector contours, bounding boxes, compass sectors
              ↓
[09. Multi-Factor Confidence Eval]  → Computes Otsu separability, spectral bimodality, alignment score
              ↓
[10. Grounded Answer Synthesis]     → Formulates natural-language answer strictly citing computed statistics
              ↓
[11. Observable Trace Generation]   → Emits step-by-step audit trail with timestamps and validation flags
```

---

## 🔬 5. Specialist Remote Sensing Capabilities

### 5.1 Single-Image Optical Intelligence
- **Hierarchical Spectral Decision Tree**:
  - **NDVI** (Normalized Difference Vegetation Index): $\frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$ (Identifies dense canopy, crops, sparse vegetation)
  - **NDWI / MNDWI** (Modified Normalized Difference Water Index): $\frac{\text{Green} - \text{SWIR}}{\text{Green} + \text{SWIR}}$ (Identifies open water, rivers, reservoirs)
  - **NDBI** (Normalized Difference Built-up Index): $\frac{\text{SWIR} - \text{NIR}}{\text{SWIR} + \text{NIR}}$ (Identifies urban fabric, concrete, bare soil)
- **Otsu & Sarle Adaptive Thresholding**: Automatically determines dynamic separation thresholds based on scene histogram variance.
- **Text-Guided Grounding**: Parses query entity (e.g., *"water bodies"* or *"buildings"*), generates the binary segmentation mask, vectorizes contiguous regions into GeoJSON polygons, bounding boxes, and compass orientations (e.g., *"North-West quadrant"*).

### 5.2 SAR Radar Backscatter & Speckle Filtering
- **Sensor Independence**: Operates regardless of cloud cover, smoke, solar illumination, or atmospheric haze.
- **Multiplicative Lee Filter**: Applied in linear power domain ($P = 10^{\sigma^0 / 10}$) across a $7\times7$ sliding kernel to suppress granular speckle noise while preserving sharp urban edges and coastlines.
- **Scattering Regime Segmentation**:
  - *Smooth / Specular Surface* (Low backscatter): Calm open water, smooth paved runways.
  - *Diffuse Rough Surface* (Medium backscatter): Agricultural fields, grasslands, bare soil.
  - *Double-Bounce / Volume Scattering* (High backscatter): Built-up urban structures, dense forest canopies.

### 5.3 Bi-Temporal Change Vector Analysis (CVA)
- **Spectral Deviation Magnitude**:
  $$\Delta \rho = \sqrt{(NDVI_{T2} - NDVI_{T1})^2 + (NDWI_{T2} - NDWI_{T1})^2 + (NDBI_{T2} - NDBI_{T1})^2}$$
- **MAD-Based Outlier Detection**: Median Absolute Deviation ($1.4826 \times \text{MAD}$) establishes dynamic change significance boundaries.
- **Physical Area Calculation**: Converts pixel counts directly to square kilometers ($km^2$) or hectares based on ground sample distance (GSD) / GeoTIFF affine transform matrices.

### 5.4 Optical + SAR Cross-Modal Fusion
- **Decision-Level Arbitration**:
  - **Built-up / Infrastructure**: SAR double-bounce radar backscatter overrides optical shadows and spectral ambiguity.
  - **Water Bodies & Wetlands**: Optical SWIR/Green absorption combined with SAR specular low backscatter ensures zero false positives.
  - **Vegetation / Crops**: Optical red-edge / NIR reflection provides chlorophyll sensitivity unachievable by SAR alone.

---

## 🛡️ 6. Spatial Evidence & Multi-Factor Confidence Engine

SatQuery AI rejects uncalibrated generative answers. Every response is paired with **verifiable spatial evidence**:

```json
{
  "evidence": {
    "dominant_class": "Vegetation",
    "class_distribution": {
      "Vegetation": 62.4,
      "Water": 18.2,
      "Built-up": 12.1,
      "Bare Soil": 7.3
    },
    "grounded_regions": [
      {
        "label": "Water Reservoir",
        "bbox": [120, 45, 380, 290],
        "area_km2": 4.18,
        "compass_quadrant": "North-West"
      }
    ]
  }
}
```

### Multi-Factor Confidence Calculation
Confidence is never a hardcoded number. It is dynamically computed as:
$$C_{\text{final}} = w_1 \cdot C_{\text{sensor}} + w_2 \cdot C_{\text{separability}} + w_3 \cdot C_{\text{alignment}} + w_4 \cdot C_{\text{agreement}}$$
- **$C_{\text{sensor}}$**: Signal-to-noise ratio, cloud cover index, and nodata percentage.
- **$C_{\text{separability}}$**: Otsu inter-class variance / total variance ($\eta$).
- **$C_{\text{alignment}}$**: Phase correlation peak magnitude between image pairs.
- **$C_{\text{agreement}}$**: Consensus score between dual independent change detectors.

---

## 🔍 7. Observable Execution Trace

Every query generates a full execution trace JSON, making the agent completely observable and auditable for scientific and defense applications:

```json
{
  "trace_id": "tr_9a8f21c0",
  "query": "What changed between these two dates and where did it occur?",
  "steps": [
    {
      "step": 1,
      "name": "InputValidator",
      "status": "PASSED",
      "duration_ms": 12,
      "metadata": { "format": "GeoTIFF", "crs": "EPSG:32643", "channels": 4, "pair_compatible": true }
    },
    {
      "step": 2,
      "name": "QueryClassifier",
      "status": "PASSED",
      "duration_ms": 4,
      "metadata": { "intent": "CHANGE_VQA", "modality": "BI_TEMPORAL" }
    },
    {
      "step": 3,
      "name": "ToolRegistry",
      "status": "PASSED",
      "duration_ms": 1,
      "metadata": { "dispatched_tools": ["cva-change-detector", "change-vqa-engine"] }
    },
    {
      "step": 4,
      "name": "ExecutionEngine",
      "status": "PASSED",
      "duration_ms": 184,
      "metadata": { "changed_pixels": 48210, "area_km2": 4.82, "direction": "Vegetation to Built-up" }
    },
    {
      "step": 5,
      "name": "ConfidenceEstimator",
      "status": "PASSED",
      "duration_ms": 8,
      "metadata": { "score": 0.892, "separability": 0.91, "spatial_consistency": 0.88 }
    }
  ]
}
```

---

## 🤖 8. Machine Learning & Remote Sensing Adaptation

### Real EuroSAT Linear Probe (`satquery-rs-visual-v1`)
- **Base Architecture**: `torchvision.models.resnet18` with genuine `IMAGENET1K_V1` weights.
- **Adaptation Technique**: Linear probe over genuine Sentinel-2 multi-spectral RGB imagery (EuroSAT). The backbone is completely frozen; only the 10-class linear classification head (5,130 trainable parameters) is trained using AdamW ($lr=10^{-3}$, CrossEntropyLoss).
- **Dataset Partition**: 2,000 training, 400 validation, 400 held-out test patches.
- **Measured Test Accuracy**: **87.25% top-1 accuracy** (349 / 400 correct) on the unseen test split.
- **Checkpoint Location**: `ml/checkpoints/satquery-rs-visual-v1/model.pt` (44.8 MB).

> **Honesty & Transparency Note**: The linear probe is utilized as a specialist scene classifier component within the Model Registry. The VQA, grounding, and change engines remain deterministic CV/RS algorithms. No synthetic metrics or fabricated LoRA benchmarks are claimed.

---

## 📚 9. Dataset Landscape & Benchmarking

| Dataset | Modality | Scale / Structure | Usage in SatQuery AI |
|:---|:---|:---|:---|
| **EuroSAT (RGB)** | Sentinel-2 Optical | 27,000 image patches, 10 land-cover classes | **Active**: Used for real linear-probe model adaptation |
| **BigEarthNet.txt** | Sentinel-1 + Sentinel-2 | 464,044 co-registered pairs, 9.6M text annotations, 15 tasks | **Target Research Foundation**: Reference for multi-task VLM adaptation |
| **reBEN (Refined BigEarthNet)** | Sentinel-1 + Sentinel-2 | 549,488 patches with pixel-level reference maps | **Planned**: Fine-tuning corpus for multi-label cross-modal segmentation |
| **RSVQA / VRSBench / CDVQA** | Optical / Bi-temporal | Standard remote-sensing VQA and grounding benchmarks | **Active**: Benchmark evaluation harness adapters in `ml/datasets/` |

---

## 💻 10. Technology Stack

```
CURRENTLY IMPLEMENTED & ACTIVE:
├── Backend: Python 3.12+, FastAPI, Uvicorn, Pydantic V2, SQLAlchemy, SQLite
├── Geospatial Engine: Rasterio, GDAL bindings, PyProj, GeoPandas, Shapely, NumPy, SciPy, OpenCV
├── Machine Learning: PyTorch 2.4, Torchvision, Transformers
├── Frontend Application: React 18, TypeScript, Vite, Tailwind CSS, Leaflet GIS, Radix UI, Lucide Icons
└── Testing & QA: Pytest, Flake8, Black, Makefile, CI validation harness

PLANNED / TARGET EXTENSIONS:
├── Storage & Scale: PostgreSQL + PostGIS (Spatial queries), Redis (Cache & Session Store)
├── ML Scaling: Parameter-Efficient Fine-Tuning (PEFT / LoRA), Multi-GPU Distributed Training
└── Deployment: Kubernetes Cluster Orchestration, Helm Charts, MinIO Object Storage
```

---

## 📊 11. Feasibility & Viability Matrix

| Dimension | Feasibility Analysis | Viability Justification |
|:---|:---|:---|
| **Technical** | Built on established geospatial libraries (GDAL, Rasterio) and deterministic spectral math with PyTorch fallback. | Zero hallucination risk; deterministic fallback ensures 100% operational uptime. |
| **Financial** | Utilizes open-source frameworks and free open-access Copernicus Sentinel-1/2 data. | Low compute footprint; runs efficiently on standard CPU/GPU infrastructure. |
| **Operational** | Eliminates manual GIS band math; accepts intuitive natural language queries. | Reduces satellite imagery interpretation time from hours to seconds. |
| **Adoption** | Designed for agricultural analysts, disaster managers, urban planners, and defense teams. | Intuitive dual-theme GUI with exportable PDF audit reports. |
| **Scalability** | Modular agentic tool registry architecture. | Seamlessly extensible to Landsat-9, PlanetScope, NISAR, and commercial constellations. |

---

## 🌍 12. Real-World Impact Domains

1. **🌾 Precision Agriculture & Food Security**: Crop health monitoring (NDVI), soil moisture estimation (SAR backscatter), drought stress detection, and yield estimation.
2. **🌊 Disaster Response & Flood Management**: Real-time all-weather flood inundation mapping using Sentinel-1 SAR, cyclone damage assessment, and post-disaster infrastructure monitoring.
3. **🌲 Environmental & Forest Conservation**: Deforestation monitoring via bi-temporal CVA, illegal mining tracking, wetland conservation, and wildfire scar analysis.
4. **🏙️ Smart Urban Planning & Infrastructure**: Urban sprawl detection, built-up density analysis using optical-SAR fusion, infrastructure compliance, and green-space tracking.
5. **🎓 Research & Earth Observation Education**: Democratizing access to complex multi-sensor satellite data for university researchers, students, and non-GIS scientists.

---

## 🗺️ 13. Phased Development Roadmap

- [x] **Phase 1: Baseline Engine (Completed)**
  - Native GeoTIFF/TIFF upload, multi-band raster parsing, RGB rendering.
  - Spectral index calculator (NDVI, NDWI, MNDWI, NDBI).
  - Single-image VQA and land-cover estimation.
- [x] **Phase 2: Agentic Orchestration & Traceability (Completed)**
  - Deterministic query classification and metadata validation gate.
  - Model & Tool Registry with PREFERRED and FALLBACK tiers.
  - Multi-factor confidence scoring and observable execution trace JSON.
- [x] **Phase 3: Model Adaptation (Completed)**
  - EuroSAT linear-probe training pipeline with 87.25% test accuracy.
  - Standalone CLI inference runner and checkpoint verification.
- [x] **Phase 4: Bi-Temporal & Grounding Engine (Completed)**
  - Phase-correlation co-registration and spatial alignment.
  - Change Vector Analysis (CVA) with MAD outlier thresholding.
  - Vector polygon contour extraction with compass quadrant localization.
- [x] **Phase 5: Optical + SAR Multimodal Fusion (Completed)**
  - Multiplicative Lee speckle filtering in linear power domain.
  - Decision-level physical rule arbitration (optical SWIR + SAR double-bounce).
- [ ] **Phase 6: Large-Scale Foundation Model Adaptation (Planned / Future Work)**
  - Parameter-Efficient Fine-Tuning (PEFT/LoRA) on BigEarthNet.txt (464k scenes).
  - PolSAR decomposition (Cloude-Pottier / Freeman-Durden).
  - Distributed PostGIS database and real-time STAC API streaming.

---

## 🚀 14. Installation & Local Deployment

### Prerequisites
- **Python**: 3.12 or newer
- **Node.js**: 20 LTS or newer
- **Git** & **Make**

### 1. Clone & Setup Backend
```bash
# Clone the repository
git clone https://github.com/Manvvv/SatQuery-AI.git
cd SatQuery-AI

# Create and activate Python virtual environment
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# or: .venv\Scripts\activate # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Generate synthetic demonstration GeoTIFF rasters
python scripts/generate_demo_data.py
```

### 2. Setup Frontend
```bash
cd frontend
npm install
cd ..
```

### 3. Start Development Servers
```bash
# Terminal 1: Backend API (Port 8000)
uvicorn backend.app.main:app --reload --port 8000

# Terminal 2: Frontend Client (Port 5173)
cd frontend
npm run dev
```
- **Web Application**: `http://localhost:5173`
- **Technical Case Study**: `http://localhost:5173/case-study`
- **FastAPI Swagger Docs**: `http://localhost:8000/docs`

---

## 🧪 15. Demo Scenarios & Test Suite

### Running Mandatory SIH Scenarios
```bash
make demo-test
```
| # | Scenario | Query | Expected Modality | Specialist Dispatched |
|:---|:---|:---|:---|:---|
| **1** | Scene Description | *"Describe the land-cover and major objects visible."* | Single Optical | Otsu Spectral Decision Tree |
| **2** | Target Grounding | *"Highlight the buildings and built-up areas."* | Single Optical | NDBI Contour Vectorizer |
| **3** | Change Analysis | *"What changed between these two dates and where?"* | Bi-Temporal Pair | Change Vector Analysis (CVA) |
| **4** | Change VQA | *"Has the built-up area increased or decreased?"* | Bi-Temporal Pair | Change VQA + Area Math |
| **5** | Cross-Modal Fusion | *"Combine optical and SAR to identify built-up and water."* | Optical + SAR Pair | Decision-Level SAR/SWIR Fusion |

### Running Unit & Adversarial Tests
```bash
# Run all automated tests
make test-all

# Run specific test suites
python -m pytest backend/tests/unit -v
python -m pytest backend/tests/geospatial -v
python -m pytest backend/tests/agent -v
python -m pytest backend/tests/adversarial -v
```

---

## 📁 16. Project Repository Structure

```
SatQuery-AI/
├── backend/                    # FastAPI Backend Application
│   ├── app/
│   │   ├── agents/             # Agent Classifier, Router, Tool Registry
│   │   ├── api/                # REST Endpoints (/analyze, /models, /health)
│   │   ├── core/               # Errors, Config, Structured Logging
│   │   ├── db/                 # SQLite & SQLAlchemy Database Models
│   │   ├── geospatial/         # Rasterio, GDAL Alignment, Reprojection, Vectorizer
│   │   ├── schemas/            # Pydantic Request & Response Contracts
│   │   └── services/           # Spectral VQA, Grounding, CVA Change, SAR Lee Filter, Fusion
│   └── tests/                  # Unit, Integration, Adversarial & Geospatial Tests
├── frontend/                   # React 18 / TypeScript Web Client
│   ├── src/
│   │   ├── components/         # UI Elements, Maps, Navigation, Theme Engine
│   │   ├── pages/              # Case Study, Workspace, Models, Datasets, Reports
│   │   ├── services/           # Typed API Client & Fallback Engine
│   │   └── router.tsx          # React Router Configuration
├── ml/                         # Machine Learning & Adaptation Pipeline
│   ├── adaptation/             # Real EuroSAT ResNet-18 Linear Probe
│   ├── checkpoints/            # satquery-rs-visual-v1 (Trained Weights)
│   ├── datasets/               # EuroSAT, RSVQA, VRSBench, CDVQA Adapters
│   ├── evaluation/             # Benchmark Metrics & Report Generation
│   └── inference/              # Standalone CLI Inference Module
├── data/demo/                  # Demo Optical & SAR GeoTIFF Files
├── docs/                       # Architecture & Traceability Documentation
├── reports/                    # Generated Benchmark Evaluation Reports
├── Makefile                    # Unified Developer Automation Script
├── requirements.txt            # Python Dependencies
└── README.md                   # Authoritative Project Documentation
```

---

## 📜 17. Requirement Traceability & References

### Traceability Matrix
- [`docs/requirement-traceability.md`](docs/requirement-traceability.md): Complete mapping of all SIH26167 problem requirements to codebase modules and test suites.
- [`docs/architecture.md`](docs/architecture.md): Deep-dive engineering design and mathematical specifications.
- [`docs/remote-sensing-adaptation.md`](docs/remote-sensing-adaptation.md): Full experimental protocol and training log for EuroSAT model adaptation.

### Research References
1. **BigEarthNet.txt**: *A Large-Scale Multi-Sensor Image-Text Dataset and Benchmark for Remote Sensing Vision-Language Models* (Gencer et al., 2024).
2. **reBEN**: *Refined BigEarthNet Dataset for Remote Sensing Image Analysis* (Clasen et al., 2024).
3. **EuroSAT**: *EuroSAT: A Novel Dataset and Deep Learning Benchmark for Land Use and Land Cover Classification* (Helber et al., 2019).
4. **Change Vector Analysis**: *Change Vector Analysis: A Review of Methods and Applications* (Johnson & Kasischke, 1998).

---

<p align="center">
  <b>SatQuery AI · Smart India Hackathon 2026 · Team SHOURYANGULU</b><br>
  <i>Empowering Geospatial Decision-Making through Agentic Multimodal AI</i>
</p>
