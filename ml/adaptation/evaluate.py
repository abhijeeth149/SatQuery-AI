"""Real post-adaptation evaluation with actual model inference (§10, §27).

Loads the trained checkpoint, runs inference on the test split,
and computes real metrics from actual predictions vs ground truth.
Never reports hardcoded numbers.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import torch
from torch.utils.data import DataLoader

from .prepare_data import BIGEARTHNET_19_CLASSES
from .train import BigEarthNetDataset, RSAdapterModel


def evaluate_adapted_model(
    checkpoint_dir: str | Path = "ml/checkpoints/satquery_adapted",
    dataset_dir: str | Path = "ml/datasets/processed",
    test_split: str = "test",
    batch_size: int = 32,
    threshold: float = 0.5,
) -> dict[str, Any]:
    """Evaluate fine-tuned model checkpoint on test dataset with real metrics.

    Returns actual computed accuracy, F1, precision, recall from the model's
    predictions — nothing hardcoded.
    """
    checkpoint_dir = Path(checkpoint_dir)
    dataset_dir = Path(dataset_dir)

    print("=" * 60)
    print("  SatQuery AI — Adapted Model Evaluation (REAL)")
    print("=" * 60)

    # Load config
    config_file = checkpoint_dir / "adapter_config.json"
    if not config_file.exists():
        print(f"  [Warning] No checkpoint config at {config_file}")
        return _empty_result(checkpoint_dir, "No checkpoint found")

    with config_file.open("r", encoding="utf-8") as f:
        config = json.load(f)

    # Load model
    best_path = checkpoint_dir / "best_model.pt"
    final_path = checkpoint_dir / "final_model.pt"
    ckpt_path = best_path if best_path.exists() else final_path

    if not ckpt_path.exists():
        print(f"  [Warning] No model weights at {ckpt_path}")
        return _empty_result(checkpoint_dir, "No model weights found")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    num_classes = config.get("num_classes", len(BIGEARTHNET_19_CLASSES))

    model = RSAdapterModel(
        num_classes=num_classes,
        lora_rank=config.get("lora_rank", 8) or 8,
        lora_alpha=config.get("lora_alpha", 16.0) or 16.0,
    ).to(device)

    checkpoint = torch.load(ckpt_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Load test dataset
    try:
        test_dataset = BigEarthNetDataset(dataset_dir, split=test_split)
    except FileNotFoundError:
        print(f"  [Warning] Test split not found in {dataset_dir}")
        return _empty_result(checkpoint_dir, f"Test split '{test_split}' not found")

    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

    print(f"  Checkpoint:    {ckpt_path.name}")
    print(f"  Dataset:       {dataset_dir}")
    print(f"  Test samples:  {len(test_dataset)}")
    print(f"  Device:        {device}")
    print("-" * 60)

    # Run inference and collect predictions
    all_preds: list[np.ndarray] = []
    all_targets: list[np.ndarray] = []

    with torch.no_grad():
        for batch_patches, batch_labels in test_loader:
            batch_patches = batch_patches.to(device)
            logits = model(batch_patches)
            probs = torch.sigmoid(logits).cpu().numpy()
            preds = (probs > threshold).astype(np.float32)
            all_preds.append(preds)
            all_targets.append(batch_labels.numpy())

    preds_arr = np.concatenate(all_preds, axis=0)
    targets_arr = np.concatenate(all_targets, axis=0)
    n_samples = preds_arr.shape[0]

    # Compute real metrics
    # Overall accuracy (element-wise)
    element_acc = float(np.mean(preds_arr == targets_arr))

    # Sample-level exact match
    exact_match = float(np.mean(np.all(preds_arr == targets_arr, axis=1)))

    # Micro-averaged precision, recall, F1
    tp = float(np.sum((preds_arr == 1) & (targets_arr == 1)))
    fp = float(np.sum((preds_arr == 1) & (targets_arr == 0)))
    fn = float(np.sum((preds_arr == 0) & (targets_arr == 1)))

    micro_precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    micro_recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    micro_f1 = 2 * micro_precision * micro_recall / (micro_precision + micro_recall) if (micro_precision + micro_recall) > 0 else 0.0

    # Per-class F1
    per_class_f1: dict[str, float] = {}
    for c in range(num_classes):
        c_tp = float(np.sum((preds_arr[:, c] == 1) & (targets_arr[:, c] == 1)))
        c_fp = float(np.sum((preds_arr[:, c] == 1) & (targets_arr[:, c] == 0)))
        c_fn = float(np.sum((preds_arr[:, c] == 0) & (targets_arr[:, c] == 1)))
        c_prec = c_tp / (c_tp + c_fp) if (c_tp + c_fp) > 0 else 0.0
        c_rec = c_tp / (c_tp + c_fn) if (c_tp + c_fn) > 0 else 0.0
        c_f1 = 2 * c_prec * c_rec / (c_prec + c_rec) if (c_prec + c_rec) > 0 else 0.0
        if c < len(BIGEARTHNET_19_CLASSES):
            per_class_f1[BIGEARTHNET_19_CLASSES[c]] = round(c_f1, 4)

    mean_f1 = float(np.mean(list(per_class_f1.values()))) if per_class_f1 else 0.0

    results = {
        "checkpoint": str(checkpoint_dir),
        "checkpoint_file": ckpt_path.name,
        "base_model": config.get("base_model"),
        "adaptation_method": config.get("adaptation_method"),
        "test_split": test_split,
        "sample_count": n_samples,
        "threshold": threshold,
        "metrics": {
            "element_accuracy": round(element_acc, 4),
            "exact_match": round(exact_match, 4),
            "micro_precision": round(micro_precision, 4),
            "micro_recall": round(micro_recall, 4),
            "micro_f1": round(micro_f1, 4),
            "mean_per_class_f1": round(mean_f1, 4),
        },
        "per_class_f1": per_class_f1,
        "training_best_val_f1": config.get("best_val_f1"),
        "is_simulated": False,
    }

    print(f"  Element Accuracy:    {element_acc * 100:.2f}%")
    print(f"  Exact Match:         {exact_match * 100:.2f}%")
    print(f"  Micro Precision:     {micro_precision:.4f}")
    print(f"  Micro Recall:        {micro_recall:.4f}")
    print(f"  Micro F1:            {micro_f1:.4f}")
    print(f"  Mean Per-Class F1:   {mean_f1:.4f}")
    print("-" * 60)

    return results


def _empty_result(checkpoint_dir: Path, reason: str) -> dict[str, Any]:
    """Return an honest empty result when evaluation cannot proceed."""
    return {
        "checkpoint": str(checkpoint_dir),
        "error": reason,
        "sample_count": 0,
        "metrics": {
            "element_accuracy": 0.0,
            "exact_match": 0.0,
            "micro_precision": 0.0,
            "micro_recall": 0.0,
            "micro_f1": 0.0,
            "mean_per_class_f1": 0.0,
        },
        "is_simulated": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Adapted RS Model (Real)")
    parser.add_argument("--checkpoint_dir", type=str, default="ml/checkpoints/satquery_adapted")
    parser.add_argument("--dataset_dir", type=str, default="ml/datasets/processed")
    parser.add_argument("--split", type=str, default="test")
    args = parser.parse_args()
    evaluate_adapted_model(args.checkpoint_dir, args.dataset_dir, args.split)
