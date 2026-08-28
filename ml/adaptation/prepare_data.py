"""BigEarthNet dataset preparation with real PyTorch Dataset objects (§10).

When real BigEarthNet patches are available locally, loads them directly.
Otherwise, generates synthetic multi-spectral patches with physically
realistic spectral signatures per LULC class so the training pipeline
is exercisable end-to-end on any machine without downloading 66 GB.

The synthetic data is clearly labelled as synthetic in the manifest —
the system never claims to have trained on real BigEarthNet unless the
real patches were present.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np

# BigEarthNet-19 class labels (CLC-based)
BIGEARTHNET_19_CLASSES: list[str] = [
    "Urban fabric",
    "Industrial or commercial units",
    "Arable land",
    "Permanent crops",
    "Pastures",
    "Complex cultivation patterns",
    "Land principally occupied by agriculture",
    "Agro-forestry areas",
    "Broad-leaved forest",
    "Coniferous forest",
    "Mixed forest",
    "Natural grasslands and sparsely vegetated areas",
    "Moors, heathland and sclerophyllous vegetation",
    "Transitional woodland, shrub",
    "Beaches, dunes, sands",
    "Inland wetlands",
    "Coastal wetlands",
    "Inland waters",
    "Marine waters",
]

# Typical Sentinel-2 reflectance centroids per class (6 bands: B02,B03,B04,B08,B11,B12)
# Scaled to uint16 range [0, 10000] as surface reflectance × 10000
_CLASS_SPECTRA: dict[str, list[float]] = {
    "Urban fabric":            [1200, 1400, 1600, 2200, 2800, 2400],
    "Industrial or commercial units": [1400, 1600, 1800, 2000, 3000, 2600],
    "Arable land":             [800,  900,  1000, 3200, 1800, 1200],
    "Permanent crops":         [600,  750,  700,  3800, 1600, 1000],
    "Pastures":                [700,  850,  800,  3600, 1700, 1100],
    "Complex cultivation patterns": [750, 900, 850, 3400, 1750, 1150],
    "Land principally occupied by agriculture": [800, 950, 900, 3200, 1800, 1200],
    "Agro-forestry areas":     [500,  650,  550,  4000, 1400, 900],
    "Broad-leaved forest":     [400,  550,  450,  4200, 1200, 800],
    "Coniferous forest":       [350,  480,  400,  3800, 1400, 900],
    "Mixed forest":            [380,  520,  430,  4000, 1300, 850],
    "Natural grasslands and sparsely vegetated areas": [900, 1000, 1100, 2800, 2000, 1400],
    "Moors, heathland and sclerophyllous vegetation":  [600, 750, 700, 3200, 1800, 1200],
    "Transitional woodland, shrub": [550, 700, 650, 3500, 1600, 1050],
    "Beaches, dunes, sands":   [1600, 1800, 2000, 2200, 2600, 2200],
    "Inland wetlands":         [500,  600,  550,  2800, 2200, 1600],
    "Coastal wetlands":        [550,  650,  600,  2600, 2400, 1800],
    "Inland waters":           [800,  700,  500,  600,  400,  300],
    "Marine waters":           [900,  800,  600,  500,  350,  250],
}

NUM_BANDS = 6
PATCH_SIZE = 64  # Small patches for fast training


def _generate_synthetic_patch(
    class_indices: list[int],
    rng: np.random.Generator,
) -> np.ndarray:
    """Generate one synthetic 6-band patch with realistic spectral noise.

    Returns shape (NUM_BANDS, PATCH_SIZE, PATCH_SIZE) as float32 [0, 1].
    """
    # Pick primary class spectrum (first label) and blend with secondary
    primary_cls = BIGEARTHNET_19_CLASSES[class_indices[0]]
    spectrum = np.array(_CLASS_SPECTRA[primary_cls], dtype=np.float32)

    # Create spatially varying patch with Gaussian noise
    patch = np.zeros((NUM_BANDS, PATCH_SIZE, PATCH_SIZE), dtype=np.float32)
    for b in range(NUM_BANDS):
        base = spectrum[b] / 10000.0  # Normalize to [0, 1]
        noise = rng.normal(0, 0.02, size=(PATCH_SIZE, PATCH_SIZE)).astype(np.float32)
        spatial_var = rng.normal(0, 0.01, size=(PATCH_SIZE, PATCH_SIZE)).astype(np.float32)
        patch[b] = np.clip(base + noise + spatial_var, 0.0, 1.0)

    # If multi-label, blend in secondary class in a random quadrant
    if len(class_indices) > 1:
        sec_cls = BIGEARTHNET_19_CLASSES[class_indices[1]]
        sec_spectrum = np.array(_CLASS_SPECTRA[sec_cls], dtype=np.float32)
        qr, qc = rng.choice(2), rng.choice(2)
        half = PATCH_SIZE // 2
        for b in range(NUM_BANDS):
            sec_val = sec_spectrum[b] / 10000.0
            noise = rng.normal(0, 0.02, size=(half, half)).astype(np.float32)
            patch[b, qr * half:(qr + 1) * half, qc * half:(qc + 1) * half] = np.clip(
                sec_val + noise, 0.0, 1.0
            )

    return patch


def generate_synthetic_dataset(
    output_dir: Path,
    num_samples: int = 200,
    seed: int = 42,
) -> dict[str, Any]:
    """Generate a synthetic BigEarthNet-like dataset for training demonstration.

    Creates actual numpy arrays saved as .npy files with multi-label annotations.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    patches_dir = output_dir / "patches"
    patches_dir.mkdir(exist_ok=True)

    rng = np.random.default_rng(seed)
    num_classes = len(BIGEARTHNET_19_CLASSES)

    samples: list[dict[str, Any]] = []
    for i in range(num_samples):
        # Assign 1-3 random labels
        n_labels = rng.choice([1, 1, 1, 2, 2, 3])  # Bias toward fewer labels
        labels = sorted(rng.choice(num_classes, size=n_labels, replace=False).tolist())

        # Generate and save patch
        patch = _generate_synthetic_patch(labels, rng)
        patch_name = f"patch_{i:05d}"
        np.save(patches_dir / f"{patch_name}.npy", patch)

        samples.append({
            "patch_id": patch_name,
            "labels": labels,
            "label_names": [BIGEARTHNET_19_CLASSES[j] for j in labels],
        })

    # Split into train/val/test (70/15/15)
    rng.shuffle(samples)
    n_train = int(num_samples * 0.70)
    n_val = int(num_samples * 0.15)

    splits = {
        "train": samples[:n_train],
        "val": samples[n_train:n_train + n_val],
        "test": samples[n_train + n_val:],
    }

    for split_name, split_samples in splits.items():
        with (output_dir / f"{split_name}.json").open("w", encoding="utf-8") as f:
            json.dump(split_samples, f, indent=2)

    manifest = {
        "dataset": "BigEarthNet-Synthetic",
        "is_synthetic": True,
        "sample_count": num_samples,
        "splits": {k: len(v) for k, v in splits.items()},
        "num_classes": num_classes,
        "class_names": BIGEARTHNET_19_CLASSES,
        "bands": ["B02", "B03", "B04", "B08", "B11", "B12"],
        "patch_size": PATCH_SIZE,
        "spectral_source": "Sentinel-2 typical reflectance centroids with Gaussian noise",
        "normalization": {
            "mean": [0.12, 0.14, 0.15, 0.28, 0.22, 0.18],
            "std": [0.05, 0.05, 0.06, 0.08, 0.07, 0.06],
        },
    }

    with (output_dir / "dataset_manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[PrepareData] Generated {num_samples} synthetic BigEarthNet patches in {output_dir}")
    print(f"  Train: {splits['train'].__len__()} | Val: {splits['val'].__len__()} | Test: {splits['test'].__len__()}")
    return manifest


def prepare_bigearthnet(
    dataset_dir: str | Path,
    output_dir: str | Path,
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
    seed: int = 42,
    num_synthetic: int = 200,
) -> dict[str, Any]:
    """Prepare BigEarthNet dataset patches and generate manifest metadata.

    If real BigEarthNet patches (.tif files) exist in dataset_dir/patches/,
    uses them. Otherwise generates synthetic data for pipeline demonstration.
    """
    dataset_dir = Path(dataset_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Check for real BigEarthNet patches
    patch_dir = dataset_dir / "patches"
    real_patches = list(patch_dir.glob("*.tif")) if patch_dir.exists() else []

    if real_patches:
        # Real BigEarthNet patches found — use them
        rng = np.random.default_rng(seed)
        rng.shuffle(real_patches)
        n = len(real_patches)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train_patches = real_patches[:n_train]
        val_patches = real_patches[n_train:n_train + n_val]
        test_patches = real_patches[n_train + n_val:]

        for split_name, split_files in [("train", train_patches), ("val", val_patches), ("test", test_patches)]:
            with (output_dir / f"{split_name}.txt").open("w", encoding="utf-8") as f:
                for p in split_files:
                    f.write(f"{p.stem}\n")

        manifest = {
            "dataset": "BigEarthNet",
            "is_synthetic": False,
            "sample_count": n,
            "splits": {"train": len(train_patches), "val": len(val_patches), "test": len(test_patches)},
            "num_classes": 19,
            "patch_dir": str(patch_dir),
            "output_dir": str(output_dir),
        }
        with (output_dir / "dataset_manifest.json").open("w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        print(f"[PrepareData] Prepared {n} real BigEarthNet patches. Manifest saved.")
        return manifest

    # No real patches — generate synthetic dataset
    print("[PrepareData] No real BigEarthNet patches found. Generating synthetic dataset...")
    return generate_synthetic_dataset(output_dir, num_samples=num_synthetic, seed=seed)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare BigEarthNet dataset for adaptation")
    parser.add_argument("--dataset_dir", type=str, default="ml/datasets/bigearthnet")
    parser.add_argument("--output_dir", type=str, default="ml/datasets/processed")
    parser.add_argument("--num_synthetic", type=int, default=200)
    args = parser.parse_args()
    prepare_bigearthnet(args.dataset_dir, args.output_dir, num_synthetic=args.num_synthetic)
